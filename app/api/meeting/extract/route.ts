import { NextRequest, NextResponse } from "next/server";
import {
  generateResilientContent,
  parseGeminiJson,
  PRIMARY_CHAT_MODEL,
} from "@/lib/gemini-resilient";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface MeetingActionItem {
  task: string;
  assignee: string;
  deadline: string;
  priority: "高" | "中" | "低";
}

export interface MeetingMinutesPayload {
  meetingTitle: string;
  summary: string[];
  decisions: string[];
  actionItems: MeetingActionItem[];
}

function normalizePriority(raw?: string): "高" | "中" | "低" {
  const val = (raw || "").trim().toLowerCase();
  if (val.includes("高") || val === "high" || val === "p0" || val === "p1") {
    return "高";
  }
  if (val.includes("低") || val === "low" || val === "p3") {
    return "低";
  }
  return "中";
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  let body: { transcript?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const transcript = body.transcript?.trim();
  const primaryModel = body.model?.trim() || PRIMARY_CHAT_MODEL;

  if (!transcript) {
    return NextResponse.json(
      { ok: false, error: "请粘贴或输入会议记录内容" },
      { status: 400 }
    );
  }

  const prompt = `あなたは日系企業の優秀な PMO・プロジェクト秘書 AI です。
以下の会議メモ・議事録テキストから重要情報を構造化して抽出し、厳密な JSON 形式で出力してください。

【抽出ルール】
1. 入力テキストの言語に合わせて自然な表現で抽出してください（日本語の会議記録なら日本語、中国語の会議記録なら中国語で出力）。
2. "summary"（会議サマリー）は必ず **3項目以内**（1〜3個）の簡潔な箇条書きに要約してください。
3. "decisions"（決定事項）は会議内で確定・合意された事項のみを列挙してください。
4. "actionItems"（アクションアイテム / ToDo）は、誰が（assignee）・いつまでに（deadline）・何をするか（task）・優先度（priority: 必ず "高"、"中"、"低" のいずれか）を漏れなく抽出してください。担当者や期限が明示されていない場合は「未定」または「要確認」と記載してください。

【出力 JSON スキーマ（厳守）】
{
  "meetingTitle": "会議名・議題タイトル",
  "summary": ["会議コア要約1", "会議コア要約2", "会議コア要約3"],
  "decisions": ["決定事項1", "決定事項2"],
  "actionItems": [
    {
      "task": "具体的なタスク内容",
      "assignee": "担当者名",
      "deadline": "期限（例：11/28(金) 17:00）",
      "priority": "高"
    }
  ]
}

【会議記録テキスト】
${transcript}`;

  try {
    const res = await generateResilientContent({
      apiKey,
      contents: prompt,
      primaryModel,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
      signal: request.signal,
      label: "MeetingMinutes",
    });

    interface RawMinutesJson {
      meetingTitle?: string;
      summary?: string[];
      decisions?: string[];
      actionItems?: Array<{
        task?: string;
        assignee?: string;
        deadline?: string;
        priority?: string;
      }>;
    }

    const parsed = parseGeminiJson<RawMinutesJson>(res.text);
    const minutes: MeetingMinutesPayload = {
      meetingTitle: parsed.meetingTitle?.trim() || "会議議事録",
      summary: Array.isArray(parsed.summary)
        ? parsed.summary.map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
        : [],
      decisions: Array.isArray(parsed.decisions)
        ? parsed.decisions.map((d) => String(d).trim()).filter(Boolean)
        : [],
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems
            .filter((item) => item && String(item.task || "").trim())
            .map((item) => ({
              task: String(item.task || "").trim(),
              assignee: String(item.assignee || "未定").trim(),
              deadline: String(item.deadline || "未定").trim(),
              priority: normalizePriority(item.priority),
            }))
        : [],
    };

    return NextResponse.json({
      ok: true,
      model: res.modelUsed,
      primaryModel: res.primaryModel,
      fallbackUsed: res.fallbackUsed,
      attempts: res.attempts,
      minutes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "会议纪要提取失败，请稍后重试";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
