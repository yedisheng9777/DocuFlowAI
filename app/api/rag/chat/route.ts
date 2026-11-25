import { NextRequest, NextResponse } from "next/server";
import { PRIMARY_CHAT_MODEL } from "@/lib/gemini-resilient";
import {
  embedQueryText,
  getSessionDocuments,
  retrieveTopChunks,
} from "@/lib/rag-store";
import { detectPrimaryLanguage } from "@/lib/rag-suggestions";

export const runtime = "nodejs";
export const maxDuration = 30;

const OVERALL_TIMEOUT_MS = 20000;
const FIRST_CHUNK_TIMEOUT_MS = 2500;
const FALLBACK_STREAM_MODEL = "gemini-flash-lite-latest";

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  let body: { sessionId?: string; question?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const sessionId = body.sessionId?.trim();
  const question = body.question?.trim();
  const primaryModel = body.model?.trim() || PRIMARY_CHAT_MODEL;

  if (!sessionId || !question) {
    return NextResponse.json(
      { ok: false, error: "sessionId 和 question 不能为空" },
      { status: 400 }
    );
  }

  const sessionState = getSessionDocuments(sessionId);
  if (sessionState.totalChunks === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "当前知识库为空，请先上传文档或点击加载示例社内规定。",
      },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const overallController = new AbortController();
  const overallTimer = setTimeout(
    () => overallController.abort(),
    OVERALL_TIMEOUT_MS
  );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendEvent = (payload: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      try {
        const queryEmbedding = await embedQueryText(
          question,
          apiKey,
          overallController.signal
        );
        const retrieved = retrieveTopChunks(sessionId, queryEmbedding, 3);

        const citations = retrieved.map((item) => ({
          id: item.id,
          docName: item.docName,
          section: item.section,
          chunkIndex: item.chunkIndex,
          chunkNumber: item.chunkNumber,
          score: Number(item.score.toFixed(4)),
          similarityPercent: item.similarityPercent,
          snippet: item.content,
        }));

        sendEvent({ type: "sources", sources: citations });

        const contextBlock = retrieved
          .map(
            (chunk, index) =>
              `--- 参考片段 ${index + 1}（ファイル: ${chunk.docName} / Chunk #${chunk.chunkNumber} / セクション: ${chunk.section} / 類似度: ${chunk.similarityPercent.toFixed(1)}%）---\n${chunk.content}`
          )
          .join("\n\n");

        const questionLang = detectPrimaryLanguage(question);
        const langDirective =
          questionLang === "zh"
            ? "1. ユーザーの質問は中国語（簡体字）です。必ず簡体字中国語（Simplified Chinese）のみで回答してください。"
            : questionLang === "en"
              ? "1. The user's question is in English. Answer strictly in English only."
              : "1. ユーザーの質問は日本語です。必ず丁寧な日本語のみで回答してください。";

        const prompt = `あなたは企業内部ナレッジベースのアシスタント「DocuFlow AI」です。
以下の【参考資料】の内容のみを根拠として、ユーザーの質問に正確かつ簡潔・丁寧に回答してください。

回答ルール：
${langDirective}
2. 参考資料に明記されている金額・上限・期限・条件・承認フローなどの数値や固有名詞は省略せず正確に伝えてください。
3. 参考資料に記載がない事項については推測で補わず、該当する記載がない旨を質問の言語で正直に伝えてください。
4. 回答の末尾には、根拠として参照した出典セクション名を必ず次の形式で明記してください（複数ある場合は列挙）：
[引用: セクション名]

【参考資料】
${contextBlock}

【ユーザーの質問】
${question}`;

        const models = Array.from(
          new Set([
            primaryModel,
            FALLBACK_STREAM_MODEL,
            "gemini-3-flash-preview",
          ])
        );

        let activeModel = primaryModel;
        let lastError: unknown = null;
        let streamedAnyChunk = false;

        for (let idx = 0; idx < models.length; idx++) {
          const candidate = models[idx];
          const hasFallback = idx < models.length - 1;
          const attemptController = new AbortController();
          const onOverallAbort = () => attemptController.abort();
          overallController.signal.addEventListener("abort", onOverallAbort, {
            once: true,
          });

          const connectTimer = hasFallback
            ? setTimeout(
                () => attemptController.abort(),
                FIRST_CHUNK_TIMEOUT_MS
              )
            : null;
          const clearConnect = () => {
            if (connectTimer) clearTimeout(connectTimer);
          };

          try {
            const upstream = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
                candidate
              )}:streamGenerateContent?alt=sse`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-goog-api-key": apiKey,
                },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: prompt }] }],
                  generationConfig: {
                    maxOutputTokens: 700,
                    temperature: 0.2,
                  },
                }),
                cache: "no-store",
                signal: attemptController.signal,
              }
            );

            if (!upstream.ok || !upstream.body) {
              const errText = await upstream.text().catch(() => "");
              throw new Error(
                `[${upstream.status}] ${errText.slice(0, 200) || upstream.statusText}`
              );
            }

            const reader = upstream.body.getReader();
            const decoder = new TextDecoder();
            let sseBuffer = "";

            const processSseLine = (rawLine: string) => {
              const trimmed = rawLine.trim();
              if (!trimmed.startsWith("data:")) return;
              const payloadStr = trimmed.slice(5).trim();
              if (!payloadStr || payloadStr === "[DONE]") return;

              let parsed: GeminiStreamChunk;
              try {
                parsed = JSON.parse(payloadStr) as GeminiStreamChunk;
              } catch {
                return;
              }
              if (parsed.error?.message) {
                throw new Error(parsed.error.message);
              }
              const parts = parsed.candidates?.[0]?.content?.parts || [];
              for (const part of parts) {
                if (part.text) {
                  clearConnect();
                  streamedAnyChunk = true;
                  sendEvent({ type: "delta", text: part.text });
                }
              }
            };

            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              sseBuffer += decoder.decode(value, { stream: true });
              let nl = sseBuffer.indexOf("\n");
              while (nl >= 0) {
                const line = sseBuffer.slice(0, nl);
                sseBuffer = sseBuffer.slice(nl + 1);
                processSseLine(line);
                nl = sseBuffer.indexOf("\n");
              }
            }
            if (sseBuffer.trim()) {
              processSseLine(sseBuffer);
            }

            clearConnect();
            activeModel = candidate;
            break;
          } catch (err) {
            clearConnect();
            lastError = err;
            if (
              overallController.signal.aborted ||
              streamedAnyChunk ||
              !hasFallback
            ) {
              throw err;
            }
          } finally {
            clearConnect();
            overallController.signal.removeEventListener(
              "abort",
              onOverallAbort
            );
          }
        }

        if (!streamedAnyChunk && lastError) {
          throw lastError;
        }

        sendEvent({
          type: "done",
          model: activeModel,
          primaryModel,
          fallbackUsed: activeModel !== primaryModel,
        });
      } catch (error) {
        const isTimeout =
          overallController.signal.aborted ||
          (error instanceof Error && error.name === "AbortError");
        const message = isTimeout
          ? "请求超时，请稍后重试。"
          : error instanceof Error
            ? error.message
            : "RAG 检索或问答失败";
        sendEvent({ type: "error", error: message });
      } finally {
        clearTimeout(overallTimer);
        controller.close();
      }
    },
    cancel() {
      clearTimeout(overallTimer);
      overallController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
