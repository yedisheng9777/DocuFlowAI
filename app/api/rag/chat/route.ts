import { NextRequest, NextResponse } from "next/server";
import {
  CHAT_MODEL,
  embedQueryText,
  getSessionDocuments,
  retrieveTopChunks,
} from "@/lib/rag-store";
import {
  FALLBACK_CHAT_MODELS,
  openResilientGeminiStream,
} from "@/lib/gemini-resilient";

export const runtime = "nodejs";
export const maxDuration = 60;

function sseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  let body: {
    sessionId?: string;
    question?: string;
    model?: string;
    fallbackModels?: string[];
  };
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
  const primaryModel = body.model?.trim() || CHAT_MODEL;
  const fallbackModels = Array.isArray(body.fallbackModels)
    ? body.fallbackModels
    : FALLBACK_CHAT_MODELS;

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

  try {
    const queryEmbedding = await embedQueryText(question, apiKey);
    const retrieved = retrieveTopChunks(sessionId, queryEmbedding, 3);

    const contextBlock = retrieved
      .map(
        (chunk, index) =>
          `--- 参考片段 ${index + 1}（ファイル: ${chunk.docName} / Chunk #${chunk.chunkNumber} / セクション: ${chunk.section} / 類似度: ${chunk.similarityPercent.toFixed(1)}%）---\n${chunk.content}`
      )
      .join("\n\n");

    const prompt = `あなたは企業内部ナレッジベースのアシスタント「DocuFlow AI」です。
以下の【参考資料】の内容のみを根拠として、ユーザーの質問に正確かつ簡潔・丁寧に回答してください。

回答ルール：
1. 質問の言語に合わせて回答してください（日本語の質問には日本語で、中国語の質問には中国語で回答してください）。
2. 参考資料に明記されている金額・上限・期限・条件・承認フローなどの数値や固有名詞は省略せず正確に伝えてください。
3. 参考資料に記載がない事項については推測で補わず、「提供された資料には該当する記載がありません」と正直に伝えてください。
4. 回答の末尾には、根拠として参照した出典セクション名を必ず次の形式で明記してください（複数ある場合は列挙）：
[引用: セクション名]

【参考資料】
${contextBlock}

【ユーザーの質問】
${question}`;

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              sseEvent({
                type: "sources",
                sources: retrieved.map((item) => ({
                  id: item.id,
                  docName: item.docName,
                  section: item.section,
                  chunkIndex: item.chunkIndex,
                  chunkNumber: item.chunkNumber,
                  score: Number(item.score.toFixed(4)),
                  similarityPercent: item.similarityPercent,
                  snippet: item.content,
                })),
              })
            )
          );

          const streamConn = await openResilientGeminiStream({
            apiKey,
            prompt,
            primaryModel,
            fallbackModels,
            signal: request.signal,
          });

          controller.enqueue(
            encoder.encode(
              sseEvent({
                type: "meta",
                model: streamConn.modelUsed,
                primaryModel: streamConn.primaryModel,
                fallbackUsed: streamConn.fallbackUsed,
                attempts: streamConn.attempts,
              })
            )
          );

          if (streamConn.firstChunkText) {
            controller.enqueue(
              encoder.encode(
                sseEvent({ type: "delta", text: streamConn.firstChunkText })
              )
            );
          }

          while (true) {
            const next = await streamConn.iterator.next();
            if (next.done) break;
            const text = next.value.text();
            if (text) {
              controller.enqueue(
                encoder.encode(sseEvent({ type: "delta", text }))
              );
            }
          }

          console.info(
            `[DocuFlow RAG] Response finished: modelUsed=${streamConn.modelUsed}, primaryModel=${streamConn.primaryModel}, fallbackUsed=${streamConn.fallbackUsed}, attempts=${streamConn.attempts}`
          );

          controller.enqueue(
            encoder.encode(
              sseEvent({
                type: "done",
                model: streamConn.modelUsed,
                primaryModel: streamConn.primaryModel,
                fallbackUsed: streamConn.fallbackUsed,
                attempts: streamConn.attempts,
              })
            )
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Gemini 流式生成中断";
          console.error(`[DocuFlow RAG] Stream error: ${message}`);
          controller.enqueue(
            encoder.encode(sseEvent({ type: "error", error: message }))
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "RAG 检索或问答失败";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
