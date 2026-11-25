import { NextRequest, NextResponse } from "next/server";
import { translateSuggestionsToRemainingLangs } from "@/lib/rag-suggestions";
import type { SuggestedQuestion, SupportedUiLang } from "@/lib/sample-manual";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  let body: {
    questions?: SuggestedQuestion[];
    sourceLang?: SupportedUiLang;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const questions = Array.isArray(body.questions) ? body.questions : [];
  if (questions.length === 0) {
    return NextResponse.json(
      { ok: false, error: "questions array is required" },
      { status: 400 }
    );
  }

  try {
    const translations = await translateSuggestionsToRemainingLangs({
      questions,
      sourceLang: body.sourceLang,
      apiKey,
    });
    return NextResponse.json({ ok: true, translations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to translate suggestions";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
