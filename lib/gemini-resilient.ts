import {
  EnhancedGenerateContentResponse,
  GenerationConfig,
  GoogleGenerativeAI,
  Part,
} from "@google/generative-ai";

export const PRIMARY_CHAT_MODEL = "gemini-3.1-flash-lite";
export const FALLBACK_CHAT_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
];

export const DEFAULT_MAX_RETRIES = 3;

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxJitterMs?: number;
  signal?: AbortSignal;
  label?: string;
}

export interface ResilientStreamResult {
  modelUsed: string;
  primaryModel: string;
  fallbackUsed: boolean;
  attempts: number;
  firstChunkText: string;
  iterator: AsyncIterator<EnhancedGenerateContentResponse>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  const msg = getErrorMessage(error);
  const match = msg.match(/\[(\d{3})\s+[^\]]+\]/);
  return match ? Number(match[1]) : undefined;
}

/**
 * Returns true if the error is a transient 503/429 rate-limit or capacity error
 * worth retrying on the same model. Hard quota=0 errors return false so fallback
 * can happen immediately without wasting retry delays.
 */
export function isRetryableTransientError(error: unknown): boolean {
  const status = getHttpStatus(error);
  const msg = getErrorMessage(error);

  if (status === 429 && /limit:\s*0\b/i.test(msg)) {
    return false;
  }

  if (status === 503 || status === 429) {
    return true;
  }

  return /(503\s+Service Unavailable|429\s+Too Many Requests|high demand|UNAVAILABLE|RESOURCE_EXHAUSTED)/i.test(
    msg
  );
}

/**
 * Returns true when an error justifies falling back to an alternate model.
 */
export function isFallbackEligibleError(error: unknown): boolean {
  if (isRetryableTransientError(error)) return true;
  const status = getHttpStatus(error);
  return status === 404 || status === 429 || status === 503;
}

function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new Error("Request aborted"));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new Error("Request aborted"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function computeBackoffDelayMs(
  retryNumber: number,
  baseDelayMs: number,
  maxJitterMs: number
): number {
  const exponential = baseDelayMs * Math.pow(2, retryNumber - 1);
  const jitter = Math.floor(Math.random() * maxJitterMs);
  return exponential + jitter;
}

/**
 * Executes an async operation with exponential backoff + jitter retries on 503/429.
 */
export async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<{ result: T; attempts: number }> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? 600;
  const maxJitterMs = options.maxJitterMs ?? 400;
  const label = options.label || "Gemini";

  let lastError: unknown;
  for (let retry = 0; retry <= maxRetries; retry++) {
    if (options.signal?.aborted) {
      throw new Error("Request aborted");
    }

    const attempt = retry + 1;
    try {
      const result = await operation();
      return { result, attempts: attempt };
    } catch (error) {
      lastError = error;
      const canRetry =
        retry < maxRetries && isRetryableTransientError(error);
      if (!canRetry) {
        throw error;
      }

      const delayMs = computeBackoffDelayMs(
        retry + 1,
        baseDelayMs,
        maxJitterMs
      );
      const status = getHttpStatus(error) ?? "transient";
      console.warn(
        `[DocuFlow ${label}] Attempt ${attempt}/${maxRetries + 1} failed (${status}), retrying in ${delayMs}ms...`
      );
      await sleepWithSignal(delayMs, options.signal);
    }
  }

  throw lastError;
}

export interface ResilientContentResult {
  modelUsed: string;
  primaryModel: string;
  fallbackUsed: boolean;
  attempts: number;
  text: string;
}

/**
 * Generates a complete (non-streaming) Gemini response with up to 3
 * exponential-backoff+jitter retries on 503/429 and automatic fallback
 * across healthy alternate models. Supports text and multimodal Part arrays
 * as well as structured JSON via generationConfig.responseMimeType.
 */
export async function generateResilientContent(params: {
  apiKey: string;
  contents: string | Array<string | Part>;
  generationConfig?: GenerationConfig;
  systemInstruction?: string;
  primaryModel?: string;
  fallbackModels?: string[];
  maxRetries?: number;
  baseDelayMs?: number;
  maxJitterMs?: number;
  signal?: AbortSignal;
  label?: string;
}): Promise<ResilientContentResult> {
  const primaryModel = params.primaryModel?.trim() || PRIMARY_CHAT_MODEL;
  const fallbacks = (params.fallbackModels ?? FALLBACK_CHAT_MODELS).filter(
    (m) => m && m !== primaryModel
  );
  const modelChain = Array.from(new Set([primaryModel, ...fallbacks]));
  const genAI = new GoogleGenerativeAI(params.apiKey);

  let totalAttempts = 0;
  const errors: string[] = [];

  for (let i = 0; i < modelChain.length; i++) {
    const modelName = modelChain[i];
    try {
      const { result, attempts } = await withGeminiRetry(
        async () => {
          const model = genAI.getGenerativeModel({
            model: modelName,
            ...(params.generationConfig
              ? { generationConfig: params.generationConfig }
              : {}),
            ...(params.systemInstruction
              ? { systemInstruction: params.systemInstruction }
              : {}),
          });
          const response = await model.generateContent(
            params.contents,
            params.signal ? { signal: params.signal } : undefined
          );
          return response.response.text();
        },
        {
          maxRetries: params.maxRetries ?? DEFAULT_MAX_RETRIES,
          baseDelayMs: params.baseDelayMs ?? 600,
          maxJitterMs: params.maxJitterMs ?? 400,
          signal: params.signal,
          label: `${params.label || "Content"}(${modelName})`,
        }
      );

      totalAttempts += attempts;
      const fallbackUsed = modelName !== primaryModel;
      if (fallbackUsed) {
        console.info(
          `[DocuFlow ${params.label || "Content"}] Fallback succeeded: primary=${primaryModel} -> active=${modelName} (totalAttempts=${totalAttempts})`
        );
      } else {
        console.info(
          `[DocuFlow ${params.label || "Content"}] Completed with primary model=${modelName} (attempts=${attempts})`
        );
      }

      return {
        modelUsed: modelName,
        primaryModel,
        fallbackUsed,
        attempts: totalAttempts,
        text: result,
      };
    } catch (error) {
      const msg = getErrorMessage(error);
      errors.push(`${modelName}: ${msg}`);
      totalAttempts += params.maxRetries ?? DEFAULT_MAX_RETRIES;

      const hasNextModel = i < modelChain.length - 1;
      if (
        !hasNextModel ||
        !isFallbackEligibleError(error) ||
        params.signal?.aborted
      ) {
        throw new Error(`所有模型均请求失败（${errors.join(" | ")}）`);
      }

      console.warn(
        `[DocuFlow ${params.label || "Content"}] Model ${modelName} unavailable after retries, falling back to ${modelChain[i + 1]}. Reason: ${msg}`
      );
    }
  }

  throw new Error(`未能获取 Gemini 响应（${errors.join(" | ")}）`);
}

/**
 * Strips optional markdown code fences and parses a JSON payload.
 */
export function parseGeminiJson<T>(rawText: string): T {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Opens a Gemini streaming response with up to 3 exponential-backoff+jitter retries
 * on 503/429 per model, and automatically falls back through alternate models if
 * the primary model remains unavailable.
 */
export async function openResilientGeminiStream(params: {
  apiKey: string;
  prompt: string;
  primaryModel?: string;
  fallbackModels?: string[];
  maxRetries?: number;
  baseDelayMs?: number;
  maxJitterMs?: number;
  signal?: AbortSignal;
}): Promise<ResilientStreamResult> {
  const primaryModel = params.primaryModel?.trim() || PRIMARY_CHAT_MODEL;
  const fallbacks = (params.fallbackModels ?? FALLBACK_CHAT_MODELS).filter(
    (m) => m && m !== primaryModel
  );
  const modelChain = Array.from(new Set([primaryModel, ...fallbacks]));
  const genAI = new GoogleGenerativeAI(params.apiKey);

  let totalAttempts = 0;
  const errors: string[] = [];

  for (let i = 0; i < modelChain.length; i++) {
    const modelName = modelChain[i];
    try {
      const { result, attempts } = await withGeminiRetry(
        async () => {
          const model = genAI.getGenerativeModel({ model: modelName });
          const streamResult = await model.generateContentStream(
            params.prompt,
            params.signal ? { signal: params.signal } : undefined
          );
          const iterator = streamResult.stream[Symbol.asyncIterator]();
          // Pull the first chunk before committing so initial 503/429 errors
          // thrown during stream opening are caught by retry/fallback.
          const first = await iterator.next();
          const firstChunkText = first.done ? "" : first.value.text();
          return { firstChunkText, iterator };
        },
        {
          maxRetries: params.maxRetries ?? DEFAULT_MAX_RETRIES,
          baseDelayMs: params.baseDelayMs ?? 600,
          maxJitterMs: params.maxJitterMs ?? 400,
          signal: params.signal,
          label: `Stream(${modelName})`,
        }
      );

      totalAttempts += attempts;
      const fallbackUsed = modelName !== primaryModel;
      if (fallbackUsed) {
        console.info(
          `[DocuFlow RAG] Fallback succeeded: primary=${primaryModel} -> active=${modelName} (totalAttempts=${totalAttempts})`
        );
      } else {
        console.info(
          `[DocuFlow RAG] Stream opened with primary model=${modelName} (attempts=${attempts})`
        );
      }

      return {
        modelUsed: modelName,
        primaryModel,
        fallbackUsed,
        attempts: totalAttempts,
        firstChunkText: result.firstChunkText,
        iterator: result.iterator,
      };
    } catch (error) {
      const msg = getErrorMessage(error);
      errors.push(`${modelName}: ${msg}`);
      totalAttempts += params.maxRetries ?? DEFAULT_MAX_RETRIES;

      const hasNextModel = i < modelChain.length - 1;
      if (!hasNextModel || !isFallbackEligibleError(error) || params.signal?.aborted) {
        throw new Error(
          `所有模型均请求失败（${errors.join(" | ")}）`
        );
      }

      console.warn(
        `[DocuFlow RAG] Model ${modelName} unavailable after retries, falling back to ${modelChain[i + 1]}. Reason: ${msg}`
      );
    }
  }

  throw new Error(`未能打开 Gemini 流式响应（${errors.join(" | ")}）`);
}
