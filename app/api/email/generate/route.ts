import { NextRequest, NextResponse } from "next/server";
import {
  generateResilientContent,
  parseGeminiJson,
  PRIMARY_CHAT_MODEL,
} from "@/lib/gemini-resilient";

export const runtime = "nodejs";
export const maxDuration = 60;

export type RecipientRole = "external_client" | "internal_manager" | "colleague";

const ROLE_INSTRUCTIONS: Record<
  RecipientRole,
  { label: string; etiquette: string }
> = {
  external_client: {
    label: "社外客户（取引先・お客様）",
    etiquette:
      "社外向けの最高レベルのビジネス敬語（尊敬語・謙譲語・丁寧語）を使用。挨拶は必ず「いつも大変お世話になっております。（自社名）の（差出人名）でございます。」など社外向け定型文を用い、結びも「何卒よろしくお願い申し上げます。」などの丁寧な表現にする。",
  },
  internal_manager: {
    label: "社内上司（部長・課長など）",
    etiquette:
      "社内の上司に対する適切な敬語を使用。社外向けの「お世話になっております」は使わず、挨拶は「お疲れ様です。（部署・差出人名）です。」を用いる。報告・連絡・相談（報連相）が明確で、お詫びや依頼も礼儀正しく簡潔に表現する。",
  },
  colleague: {
    label: "社内同事（同僚・先輩・他部署メンバー）",
    etiquette:
      "社内の同僚・他部署メンバー向けの丁寧かつ円滑なビジネス敬語（です・ます調＋クッション言葉）を使用。挨拶は「お疲れ様です。（差出人名）です。」を用い、依頼期限や確認事項が分かりやすい表現にする。",
  },
};

interface GeneratedEmailPayload {
  subject: string;
  recipientLine: string;
  greeting: string;
  body: string;
  closing: string;
  fullEmail: string;
  keigoPoints: string[];
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
    requirement?: string;
    recipientRole?: RecipientRole;
    senderName?: string;
    model?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const requirement = body.requirement?.trim();
  const recipientRole: RecipientRole =
    body.recipientRole && body.recipientRole in ROLE_INSTRUCTIONS
      ? body.recipientRole
      : "internal_manager";
  const senderName = body.senderName?.trim() || "（氏名）";
  const primaryModel = body.model?.trim() || PRIMARY_CHAT_MODEL;

  if (!requirement) {
    return NextResponse.json(
      { ok: false, error: "请输入需要生成邮件的具体需求内容" },
      { status: 400 }
    );
  }

  const roleConfig = ROLE_INSTRUCTIONS[recipientRole];

  const prompt = `あなたは日系企業のビジネスメール・敬語作成の専門家です。
以下のユーザー要望と相手区分に基づき、実務でそのまま送信できる標準的な日本語ビジネスメールを作成し、指定の JSON 形式で出力してください。

【相手区分】
${roleConfig.label}

【敬語・マナー指針】
${roleConfig.etiquette}

【差出人名（未指定の場合は自然なプレースホルダーを使用）】
${senderName}

【ユーザーからの要望（大白話）】
${requirement}

【出力JSONスキーマ（厳守）】
{
  "subject": "メールの件名（例：【ご連絡】...）",
  "recipientLine": "宛名（例：田中部長 または 株式会社〇〇 佐藤様）",
  "greeting": "挨拶（例：お疲れ様です。... / いつも大変お世話になっております。...）",
  "body": "メール本文（要点を分かりやすく段落分けして記載）",
  "closing": "結び・署名（例：引き続きよろしくお願いいたします。\\n〇〇部 ${senderName}）",
  "fullEmail": "件名から結び・署名までを自然な改行で結合した送信可能な完全文面（1行目に「件名：...」）",
  "keigoPoints": ["中国語で簡潔に解説する敬語ポイント1", "敬語ポイント2", "敬語ポイント3"]
}`;

  try {
    const res = await generateResilientContent({
      apiKey,
      contents: prompt,
      primaryModel,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
      signal: request.signal,
      label: "BusinessEmail",
    });

    const parsed = parseGeminiJson<GeneratedEmailPayload>(res.text);
    const email: GeneratedEmailPayload = {
      subject: parsed.subject || "",
      recipientLine: parsed.recipientLine || "",
      greeting: parsed.greeting || "",
      body: parsed.body || "",
      closing: parsed.closing || "",
      fullEmail:
        parsed.fullEmail ||
        `件名：${parsed.subject}\n\n${parsed.recipientLine}\n\n${parsed.greeting}\n\n${parsed.body}\n\n${parsed.closing}`,
      keigoPoints: Array.isArray(parsed.keigoPoints) ? parsed.keigoPoints : [],
    };

    return NextResponse.json({
      ok: true,
      model: res.modelUsed,
      primaryModel: res.primaryModel,
      fallbackUsed: res.fallbackUsed,
      attempts: res.attempts,
      email,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "商务邮件生成失败，请稍后重试";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
