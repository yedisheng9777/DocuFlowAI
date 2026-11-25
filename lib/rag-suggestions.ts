import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseGeminiJson, PRIMARY_CHAT_MODEL } from "@/lib/gemini-resilient";
import type {
  SuggestedQuestion,
  SupportedUiLang,
} from "@/lib/sample-manual";

interface RawQuestionPair {
  title?: string;
  question?: string;
}

interface RawSuggestJson {
  questions?: RawQuestionPair[];
}

export function detectPrimaryLanguage(text: string): SupportedUiLang {
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return "ja";
  }
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return "zh";
  }
  return "en";
}

const LANG_LABEL: Record<SupportedUiLang, string> = {
  zh: "Simplified Chinese",
  ja: "Japanese",
  en: "English",
};

function parseQuestionsWithTruncationRecovery(
  rawText: string
): RawQuestionPair[] {
  try {
    const parsed = parseGeminiJson<RawSuggestJson>(rawText);
    if (Array.isArray(parsed.questions)) return parsed.questions;
  } catch {
    // Recover complete {"title":...,"question":...} objects if maxOutputTokens cut off the tail
    const recovered: RawQuestionPair[] = [];
    const pairRegex =
      /\{\s*"title"\s*:\s*"([^"]+)"\s*,\s*"question"\s*:\s*"([^"]+)"\s*\}/g;
    let match: RegExpExecArray | null;
    while ((match = pairRegex.exec(rawText)) !== null) {
      recovered.push({ title: match[1], question: match[2] });
    }
    if (recovered.length > 0) return recovered;
  }
  return [];
}

async function callGeminiJsonWithFastFallback(params: {
  apiKey: string;
  prompt: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs?: number;
}): Promise<string> {
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const models = [
    PRIMARY_CHAT_MODEL,
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
  ];
  const overallMs = params.timeoutMs ?? 12000;
  const perAttemptMs = 3500;
  const deadline = Date.now() + overallMs;
  let lastError: unknown;

  for (let idx = 0; idx < models.length; idx++) {
    const remaining = deadline - Date.now();
    if (remaining <= 200) break;
    const isLast = idx === models.length - 1;
    const attemptController = new AbortController();
    const attemptTimer = setTimeout(
      () => attemptController.abort(),
      isLast ? remaining : Math.min(perAttemptMs, remaining)
    );

    try {
      const model = genAI.getGenerativeModel({
        model: models[idx],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: params.maxOutputTokens,
          temperature: params.temperature,
        },
      });
      const result = await model.generateContent(params.prompt, {
        signal: attemptController.signal,
      });
      return result.response.text();
    } catch (err) {
      lastError = err;
      if (isLast) throw err;
    } finally {
      clearTimeout(attemptTimer);
    }
  }

  throw lastError ?? new Error("Failed to generate suggestions");
}

/**
 * Generates 3 short document-grounded suggested questions in the document's
 * own primary language using a single minimal Gemini call (maxOutputTokens: 200).
 */
export async function generateDocSuggestions(params: {
  docId: string;
  docName: string;
  chunks: Array<{ section: string; content: string }>;
  apiKey: string;
  timeoutMs?: number;
}): Promise<{ docLang: SupportedUiLang; questions: SuggestedQuestion[] }> {
  const maxExcerptChars = 2200;
  let excerpt = "";
  for (const chunk of params.chunks) {
    const addition = `[${chunk.section}]\n${chunk.content}\n\n`;
    if (excerpt.length + addition.length > maxExcerptChars) {
      if (!excerpt) excerpt = addition.slice(0, maxExcerptChars);
      break;
    }
    excerpt += addition;
  }

  const docLang = detectPrimaryLanguage(excerpt);
  const prompt = `Write 3 very short questions from this excerpt in ${LANG_LABEL[docLang]}.
Title <=6 CJK chars / <=3 EN words. Question <=18 CJK chars / <=12 EN words.
Compact JSON only: {"questions":[{"title":"...","question":"..."}]}

${excerpt}`;

  const rawText = await callGeminiJsonWithFastFallback({
    apiKey: params.apiKey,
    prompt,
    maxOutputTokens: 200,
    temperature: 0.2,
    timeoutMs: params.timeoutMs,
  });

  const pairs = parseQuestionsWithTruncationRecovery(rawText);
  const questions = pairs
    .map((item, qIdx) => {
      const title = String(item?.title || "").trim();
      const question = String(item?.question || "").trim();
      return {
        id: `dyn-${params.docId}-${qIdx}`,
        title,
        label: title,
        question,
      };
    })
    .filter((item) => item.title && item.question)
    .slice(0, 3);
  return { docLang, questions };
}

/**
 * Silently translates 3 short suggested questions into the remaining two UI
 * languages in a single lightweight call (maxOutputTokens: 300).
 */
export async function translateSuggestionsToRemainingLangs(params: {
  questions: SuggestedQuestion[];
  sourceLang?: SupportedUiLang;
  apiKey: string;
  timeoutMs?: number;
}): Promise<Partial<Record<SupportedUiLang, SuggestedQuestion[]>>> {
  const sourceItems = params.questions.slice(0, 3).map((q) => ({
    title: q.title || q.label || "",
    question: q.question,
  }));
  if (sourceItems.length === 0) return {};

  const detected =
    params.sourceLang ||
    detectPrimaryLanguage(
      sourceItems.map((item) => `${item.title} ${item.question}`).join(" ")
    );
  const targetLangs = (["zh", "ja", "en"] as SupportedUiLang[]).filter(
    (lang) => lang !== detected
  );

  const prompt = `Translate these 3 short items accurately into ${targetLangs[0]} (${LANG_LABEL[targetLangs[0]]}) and ${targetLangs[1]} (${LANG_LABEL[targetLangs[1]]}). Keep concise.
JSON only: {"${targetLangs[0]}":[{"title":"...","question":"..."}],"${targetLangs[1]}":[{"title":"...","question":"..."}]}
Input: ${JSON.stringify(sourceItems)}`;

  const rawText = await callGeminiJsonWithFastFallback({
    apiKey: params.apiKey,
    prompt,
    maxOutputTokens: 300,
    temperature: 0.1,
    timeoutMs: params.timeoutMs,
  });

  const parsed = parseGeminiJson<
    Partial<Record<SupportedUiLang, RawQuestionPair[]>>
  >(rawText);

  const translations: Partial<Record<SupportedUiLang, SuggestedQuestion[]>> =
    {};

  for (const lang of targetLangs) {
    const arr = parsed?.[lang];
    if (!Array.isArray(arr)) continue;
    const mapped = params.questions
      .slice(0, 3)
      .map((orig, qIdx) => {
        const pair = arr[qIdx];
        const title = String(pair?.title || "").trim();
        const question = String(pair?.question || "").trim();
        return {
          id: orig.id,
          title,
          label: title,
          question,
        };
      })
      .filter((item) => item.title && item.question);
    if (mapped.length > 0) {
      translations[lang] = mapped;
    }
  }

  return translations;
}
