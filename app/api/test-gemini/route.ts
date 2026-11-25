import { NextRequest, NextResponse } from "next/server";
import {
  generateResilientContent,
  PRIMARY_CHAT_MODEL,
} from "@/lib/gemini-resilient";

/**
 * Minimal health-check endpoint to verify GEMINI_API_KEY connectivity
 * with retry + fallback support.
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  const primaryModel =
    request.nextUrl.searchParams.get("model")?.trim() || PRIMARY_CHAT_MODEL;

  try {
    const res = await generateResilientContent({
      apiKey,
      contents: "Reply with exactly: OK",
      primaryModel,
      label: "HealthCheck",
    });

    return NextResponse.json({
      ok: true,
      model: res.modelUsed,
      primaryModel: res.primaryModel,
      fallbackUsed: res.fallbackUsed,
      attempts: res.attempts,
      reply: res.text.trim(),
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Unknown Gemini API error";
    return NextResponse.json(
      { ok: false, model: primaryModel, error: msg },
      { status: 500 }
    );
  }
}
