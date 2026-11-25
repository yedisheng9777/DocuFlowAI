import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/rag-store";
import { generateDocSuggestions } from "@/lib/rag-suggestions";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  let body: { sessionId?: string; docId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const sessionId = body.sessionId?.trim();
  const docId = body.docId?.trim();

  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "sessionId is required" },
      { status: 400 }
    );
  }

  const session = getOrCreateSession(sessionId);
  const targetDoc = docId
    ? session.documents.find((d) => d.id === docId)
    : session.documents[session.documents.length - 1];
  const targetDocId = targetDoc?.id || docId || "doc";

  const docChunks = targetDoc?.id
    ? session.chunks.filter((c) => c.docId === targetDoc.id)
    : session.chunks;

  if (docChunks.length === 0) {
    return NextResponse.json(
      { ok: false, error: "未找到已解析的文档片段，无法生成推荐提问" },
      { status: 400 }
    );
  }

  try {
    const { docLang, questions } = await generateDocSuggestions({
      docId: targetDocId,
      docName: targetDoc?.name || docChunks[0]?.docName || "uploaded-document",
      chunks: docChunks,
      apiKey,
    });

    return NextResponse.json({ ok: true, docLang, suggestions: questions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "生成推荐提问失败";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
