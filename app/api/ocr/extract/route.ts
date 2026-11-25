import { NextRequest, NextResponse } from "next/server";
import {
  generateResilientContent,
  parseGeminiJson,
  PRIMARY_CHAT_MODEL,
} from "@/lib/gemini-resilient";

export const runtime = "nodejs";
export const maxDuration = 60;

type DocTypeHint = "auto" | "receipt" | "business_card";

function isUploadedFile(
  value: unknown
): value is Blob & { name?: string; type?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === "function"
  );
}

function inferMimeType(fileName: string, providedType?: string): string | null {
  if (
    providedType === "image/jpeg" ||
    providedType === "image/png" ||
    providedType === "image/webp"
  ) {
    return providedType;
  }
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

export interface OcrLineItem {
  name: string;
  quantity: string;
  amount: string;
}

export interface OcrFieldRow {
  key: string;
  label: string;
  value: string;
}

export interface OcrExtractionPayload {
  documentType: "receipt" | "business_card";
  fields: OcrFieldRow[];
  lineItems: OcrLineItem[];
  notes?: string;
}

export interface PreprocessingInfo {
  enabled: boolean;
  applied: boolean;
  mode: "opencv" | "direct_fallback" | "direct_manual";
  metrics?: {
    width: number;
    height: number;
    resolution: string;
    original_sharpness: number;
    processed_sharpness: number;
    laplacian_variance: number;
    pipeline: string[];
  };
  processedImageDataUrl?: string;
  fallbackReason?: string;
}

const DEFAULT_PYTHON_PREPROCESS_URL =
  "http://127.0.0.1:8000/preprocess-receipt";

async function tryOpenCvPreprocess(params: {
  arrayBuffer: ArrayBuffer;
  fileName: string;
  mimeType: string;
  docType: DocTypeHint;
}): Promise<{
  info: PreprocessingInfo;
  imageBase64?: string;
  imageMimeType?: string;
}> {
  const configuredUrl = process.env.PYTHON_PREPROCESS_URL?.trim();
  if (process.env.VERCEL && !configuredUrl) {
    return {
      info: {
        enabled: true,
        applied: false,
        mode: "direct_fallback",
        fallbackReason:
          "Vercel serverless mode (PYTHON_PREPROCESS_URL not configured)",
      },
    };
  }

  const serviceUrl = configuredUrl || DEFAULT_PYTHON_PREPROCESS_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const outbound = new FormData();
    outbound.append(
      "file",
      new Blob([params.arrayBuffer], { type: params.mimeType }),
      params.fileName
    );
    outbound.append("doc_type", params.docType);

    const res = await fetch(serviceUrl, {
      method: "POST",
      body: outbound,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${errText}`.trim());
    }

    const data = (await res.json()) as {
      ok?: boolean;
      mime_type?: string;
      processed_image_base64?: string;
      processed_image_data_url?: string;
      metrics?: PreprocessingInfo["metrics"];
    };

    if (!data.ok || !data.processed_image_base64) {
      throw new Error("Invalid response from OpenCV preprocessing service");
    }

    const processedMime = data.mime_type || "image/png";
    const dataUrl =
      data.processed_image_data_url ||
      `data:${processedMime};base64,${data.processed_image_base64}`;

    console.info(
      `[DocuFlow OCR] OpenCV preprocessing applied (${data.metrics?.resolution || "unknown"}, sharpness ${data.metrics?.original_sharpness} -> ${data.metrics?.processed_sharpness})`
    );

    return {
      info: {
        enabled: true,
        applied: true,
        mode: "opencv",
        metrics: data.metrics,
        processedImageDataUrl: dataUrl,
      },
      imageBase64: data.processed_image_base64,
      imageMimeType: processedMime,
    };
  } catch (err) {
    const reason =
      err instanceof Error ? err.message : "Python service unreachable";
    console.warn(
      `[DocuFlow OCR] OpenCV service unavailable (${reason}), falling back to direct original image.`
    );
    return {
      info: {
        enabled: true,
        applied: false,
        mode: "direct_fallback",
        fallbackReason: reason,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
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
    const formData = await request.formData();
    const file = formData.get("file");
    const docTypeRaw = String(formData.get("docType") || "auto").trim();
    const docType: DocTypeHint =
      docTypeRaw === "receipt" || docTypeRaw === "business_card"
        ? docTypeRaw
        : "auto";
    const modelOverride = String(formData.get("model") || "").trim();
    const primaryModel = modelOverride || PRIMARY_CHAT_MODEL;
    const useOpenCv =
      String(formData.get("useOpenCv") ?? "true").trim().toLowerCase() !==
      "false";

    if (!isUploadedFile(file)) {
      return NextResponse.json(
        { ok: false, error: "请上传收据或名片图片（JPG / PNG / WEBP）" },
        { status: 400 }
      );
    }

    const fileName =
      typeof file.name === "string" && file.name.trim()
        ? file.name.trim()
        : "upload.png";
    const mimeType = inferMimeType(fileName, file.type);

    if (!mimeType) {
      return NextResponse.json(
        {
          ok: false,
          error: "不支持的图片格式，请上传 JPG、PNG 或 WEBP 图片。",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { ok: false, error: "上传的图片文件为空" },
        { status: 400 }
      );
    }

    const originalBase64 = Buffer.from(arrayBuffer).toString("base64");

    let activeBase64 = originalBase64;
    let activeMimeType = mimeType;
    let preprocessing: PreprocessingInfo = {
      enabled: false,
      applied: false,
      mode: "direct_manual",
    };

    if (useOpenCv) {
      const pre = await tryOpenCvPreprocess({
        arrayBuffer,
        fileName,
        mimeType,
        docType,
      });
      preprocessing = pre.info;
      if (pre.info.applied && pre.imageBase64 && pre.imageMimeType) {
        activeBase64 = pre.imageBase64;
        activeMimeType = pre.imageMimeType;
      }
    }

    const typeInstruction =
      docType === "receipt"
        ? "该图片为财务收据/发票（レシート / 領収書）。"
        : docType === "business_card"
          ? "该图片为商务名片（名刺）。"
          : "请先自动判断该图片是财务收据（receipt）还是商务名片（business_card），再提取对应结构化字段。";

    const prompt = `あなたは高精度な企業向け OCR・構造化データ抽出 AI です。
${typeInstruction}
画像内の文字を正確に読み取り、必ず以下の JSON スキーマに従って出力してください。画像に記載されていない項目は空文字 "" にしてください（推測で捏造しないでください）。

【出力 JSON スキーマ】
{
  "documentType": "receipt" または "business_card",
  "receipt": {
    "date": "日付（例: 2026-11-25）",
    "vendor": "店名・発行元会社名",
    "totalAmount": "合計金額（通貨記号付き、例: ¥3,850）",
    "taxAmount": "消費税額（例: ¥350、記載がなければ空文字）",
    "currency": "通貨コード（例: JPY / CNY / USD）",
    "paymentMethod": "支払方法（現金・クレジットカード等、不明なら空文字）",
    "summary": "経費摘要・用途の要約",
    "lineItems": [
      { "name": "品名", "quantity": "数量", "amount": "金額" }
    ]
  },
  "businessCard": {
    "name": "氏名",
    "nameReading": "フリガナ・読み方（記載がある場合）",
    "company": "会社名",
    "department": "部署名",
    "title": "役職",
    "phone": "電話番号（携帯・代表等）",
    "email": "メールアドレス",
    "address": "住所",
    "website": "WebサイトURL"
  },
  "notes": "補足事項（インボイス登録番号や軽減税率対象などがあれば記載）"
}`;

    const res = await generateResilientContent({
      apiKey,
      contents: [
        prompt,
        {
          inlineData: {
            data: activeBase64,
            mimeType: activeMimeType,
          },
        },
      ],
      primaryModel,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
      signal: request.signal,
      label: "MultimodalOCR",
    });

    interface RawOcrJson {
      documentType?: string;
      receipt?: {
        date?: string;
        vendor?: string;
        totalAmount?: string;
        taxAmount?: string;
        currency?: string;
        paymentMethod?: string;
        summary?: string;
        lineItems?: OcrLineItem[];
      };
      businessCard?: {
        name?: string;
        nameReading?: string;
        company?: string;
        department?: string;
        title?: string;
        phone?: string;
        email?: string;
        address?: string;
        website?: string;
      };
      notes?: string;
    }

    const parsed = parseGeminiJson<RawOcrJson>(res.text);
    const resolvedType: "receipt" | "business_card" =
      parsed.documentType === "business_card" ||
      (docType === "business_card" && parsed.documentType !== "receipt")
        ? "business_card"
        : "receipt";

    let fields: OcrFieldRow[] = [];
    let lineItems: OcrLineItem[] = [];

    if (resolvedType === "receipt") {
      const r = parsed.receipt || {};
      fields = [
        { key: "date", label: "日期（日付）", value: r.date || "" },
        { key: "vendor", label: "店名 / 公司名", value: r.vendor || "" },
        { key: "totalAmount", label: "总金额（合計）", value: r.totalAmount || "" },
        { key: "taxAmount", label: "税额（消費税）", value: r.taxAmount || "" },
        { key: "currency", label: "币种", value: r.currency || "" },
        {
          key: "paymentMethod",
          label: "支付方式",
          value: r.paymentMethod || "",
        },
        { key: "summary", label: "摘要 / 用途", value: r.summary || "" },
      ];
      lineItems = Array.isArray(r.lineItems) ? r.lineItems : [];
    } else {
      const b = parsed.businessCard || {};
      fields = [
        { key: "name", label: "姓名（氏名）", value: b.name || "" },
        {
          key: "nameReading",
          label: "读音（フリガナ）",
          value: b.nameReading || "",
        },
        { key: "company", label: "公司名", value: b.company || "" },
        { key: "department", label: "部门", value: b.department || "" },
        { key: "title", label: "职位", value: b.title || "" },
        { key: "phone", label: "电话", value: b.phone || "" },
        { key: "email", label: "邮箱", value: b.email || "" },
        { key: "address", label: "地址", value: b.address || "" },
        { key: "website", label: "网站", value: b.website || "" },
      ];
    }

    const result: OcrExtractionPayload = {
      documentType: resolvedType,
      fields,
      lineItems,
      notes: parsed.notes || "",
    };

    return NextResponse.json({
      ok: true,
      model: res.modelUsed,
      primaryModel: res.primaryModel,
      fallbackUsed: res.fallbackUsed,
      attempts: res.attempts,
      preprocessing,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OCR 图片识别失败，请重试";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
