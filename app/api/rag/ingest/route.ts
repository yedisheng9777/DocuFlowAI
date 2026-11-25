import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import {
  chunkDocument,
  clearSession,
  embedDocumentChunks,
  getSessionDocuments,
  removeDocumentFromSession,
  saveDocumentToSession,
} from "@/lib/rag-store";
import {
  SAMPLE_MANUAL_CONTENT,
  SAMPLE_MANUAL_FILENAME,
  SAMPLE_SUGGESTED_QUESTIONS,
} from "@/lib/sample-manual";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf"];

function isUploadedFile(
  value: unknown
): value is Blob & { name?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === "function"
  );
}

function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "sessionId is required" },
      { status: 400 }
    );
  }
  const state = getSessionDocuments(sessionId);
  return NextResponse.json({ ok: true, ...state });
}

export async function DELETE(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim();
  const docId = request.nextUrl.searchParams.get("docId")?.trim();

  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "sessionId is required" },
      { status: 400 }
    );
  }

  if (docId) {
    const state = removeDocumentFromSession(sessionId, docId);
    return NextResponse.json({ ok: true, ...state });
  }

  clearSession(sessionId);
  return NextResponse.json({ ok: true, documents: [], totalChunks: 0 });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let sessionId = "";
    let fileName = "";
    let textContent = "";
    let isSample = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      sessionId = String(formData.get("sessionId") || "").trim();
      const file = formData.get("file");

      if (!isUploadedFile(file)) {
        return NextResponse.json(
          { ok: false, error: "请选择需要上传的文件（.txt / .md / .pdf）" },
          { status: 400 }
        );
      }

      fileName =
        typeof file.name === "string" && file.name.trim()
          ? file.name.trim()
          : "uploaded.txt";
      const ext = getFileExtension(fileName);
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          {
            ok: false,
            error: `不支持的文件格式（${ext || "未知"}），仅支持 .txt、.md 或 .pdf 文件`,
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (ext === ".pdf") {
        const parsed = await pdfParse(buffer);
        textContent = parsed.text?.trim() || "";
      } else {
        textContent = buffer.toString("utf-8").trim();
      }
    } else {
      const body = (await request.json()) as {
        mode?: string;
        sessionId?: string;
        fileName?: string;
        text?: string;
      };
      sessionId = (body.sessionId || "").trim();

      if (body.mode === "sample") {
        isSample = true;
        fileName = SAMPLE_MANUAL_FILENAME;
        textContent = SAMPLE_MANUAL_CONTENT;
      } else {
        fileName = (body.fileName || "document.txt").trim();
        textContent = (body.text || "").trim();
      }
    }

    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    if (!textContent) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "未能从文件中提取到有效文本内容（如果是纯扫描图片型 PDF，暂不支持 OCR 提取）。",
        },
        { status: 400 }
      );
    }

    const rawChunks = chunkDocument(textContent, fileName);
    if (rawChunks.length === 0) {
      return NextResponse.json(
        { ok: false, error: "文档分块结果为空，请检查文件内容。" },
        { status: 400 }
      );
    }

    const embeddings = await embedDocumentChunks(
      rawChunks.map((c) => `[${c.section}]\n${c.content}`),
      apiKey
    );

    const docId = crypto.randomUUID();
    const docChunks = rawChunks.map((chunk, idx) => ({
      id: `${docId}-chunk-${idx}`,
      docId,
      docName: fileName,
      section: chunk.section,
      chunkIndex: idx,
      content: chunk.content,
      embedding: embeddings[idx],
    }));

    const uniqueSections = Array.from(new Set(rawChunks.map((c) => c.section)));
    const storedDoc = {
      id: docId,
      name: fileName,
      charCount: textContent.length,
      chunkCount: docChunks.length,
      sections: uniqueSections,
      createdAt: new Date().toISOString(),
      isSample,
    };

    const sessionState = saveDocumentToSession(sessionId, storedDoc, docChunks);

    return NextResponse.json({
      ok: true,
      sessionId,
      document: storedDoc,
      suggestedQuestions: isSample ? SAMPLE_SUGGESTED_QUESTIONS : undefined,
      ...sessionState,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "文档解析或向量化失败";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
