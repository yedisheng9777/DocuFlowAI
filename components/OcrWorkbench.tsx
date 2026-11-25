"use client";

import React, { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Contact,
  Download,
  Image as ImageIcon,
  Loader2,
  Receipt,
  ScanText,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import {
  createSampleBusinessCardFile,
  createSampleReceiptFile,
} from "@/lib/sample-ocr-images";
import { useI18n } from "@/components/I18nProvider";

type DocTypeHint = "auto" | "receipt" | "business_card";

interface OcrFieldRow {
  key: string;
  label: string;
  value: string;
}

interface OcrLineItem {
  name: string;
  quantity: string;
  amount: string;
}

interface OcrResult {
  documentType: "receipt" | "business_card";
  fields: OcrFieldRow[];
  lineItems: OcrLineItem[];
  notes?: string;
}

interface PreprocessingInfo {
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

function escapeCsvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

export default function OcrWorkbench() {
  const { t } = useI18n();
  const [docTypeHint, setDocTypeHint] = useState<DocTypeHint>("auto");
  const [useOpenCv, setUseOpenCv] = useState<boolean>(true);
  const [previewTab, setPreviewTab] = useState<"original" | "enhanced">(
    "enhanced"
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAction, setActiveAction] = useState<
    "upload" | "sample-receipt" | "sample-card" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const [extraction, setExtraction] = useState<{
    result: OcrResult;
    model: string;
    primaryModel: string;
    fallbackUsed: boolean;
    preprocessing?: PreprocessingInfo;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function processImageFile(
    file: File,
    hint: DocTypeHint,
    action: "upload" | "sample-receipt" | "sample-card"
  ) {
    setError(null);
    setIsProcessing(true);
    setActiveAction(action);
    setFileName(file.name);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", hint);
      formData.append("useOpenCv", String(useOpenCv));

      const res = await fetch("/api/ocr/extract", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t.ocr.errorFallback);
      }

      const pre: PreprocessingInfo | undefined = data.preprocessing;
      setPreviewTab(pre?.processedImageDataUrl ? "enhanced" : "original");
      setExtraction({
        result: data.result,
        model: data.model,
        primaryModel: data.primaryModel,
        fallbackUsed: Boolean(data.fallbackUsed),
        preprocessing: pre,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.ocr.errorFallback);
    } finally {
      setIsProcessing(false);
      setActiveAction(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleLoadSampleReceipt() {
    if (isProcessing) return;
    try {
      const file = await createSampleReceiptFile();
      setDocTypeHint("receipt");
      await processImageFile(file, "receipt", "sample-receipt");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.ocr.errorFallback);
    }
  }

  async function handleLoadSampleCard() {
    if (isProcessing) return;
    try {
      const file = await createSampleBusinessCardFile();
      setDocTypeHint("business_card");
      await processImageFile(file, "business_card", "sample-card");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.ocr.errorFallback);
    }
  }

  function handleExportCsv() {
    if (!extraction) return;
    const { result } = extraction;
    const rows: string[] = [];

    rows.push(
      [t.ocr.csvHeaders.docType, t.ocr.csvHeaders.field, t.ocr.csvHeaders.value]
        .map(escapeCsvCell)
        .join(",")
    );
    const typeLabel =
      result.documentType === "receipt"
        ? t.ocr.typeReceipt
        : t.ocr.typeCard;
    for (const field of result.fields) {
      const label = t.ocr.fieldLabels[field.key] || field.label;
      rows.push(
        [typeLabel, label, field.value || "-"].map(escapeCsvCell).join(",")
      );
    }

    if (result.lineItems.length > 0) {
      rows.push("");
      rows.push(
        [
          t.ocr.csvHeaders.itemName,
          t.ocr.csvHeaders.itemQty,
          t.ocr.csvHeaders.itemAmount,
        ]
          .map(escapeCsvCell)
          .join(",")
      );
      for (const item of result.lineItems) {
        rows.push(
          [item.name || "", item.quantity || "", item.amount || ""]
            .map(escapeCsvCell)
            .join(",")
        );
      }
    }

    // Prefix UTF-8 BOM so Microsoft Excel renders Japanese/Chinese characters cleanly
    const csvContent = "\uFEFF" + rows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const baseName = fileName.replace(/\.[^.]+$/, "") || "docuflow-ocr";
    link.download = `${baseName}-${result.documentType}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const preInfo = extraction?.preprocessing;
  const activePreviewSrc =
    previewTab === "enhanced" && preInfo?.processedImageDataUrl
      ? preInfo.processedImageDataUrl
      : previewUrl;

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Module Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
              {t.modules.ocr.badge}
            </span>
            <h2 className="text-lg font-semibold text-slate-900">
              {t.ocr.heading}
            </h2>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {t.ocr.description}
          </p>
        </div>

        {/* Recognition Mode Selector */}
        <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(["auto", "receipt", "business_card"] as DocTypeHint[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setDocTypeHint(id)}
              className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition ${
                docTypeHint === id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.ocr.modes[id]}
            </button>
          ))}
        </div>
      </div>

      {/* Upload + Demo Samples + OpenCV Toggle */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) processImageFile(dropped, docTypeHint, "upload");
            }}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`lg:col-span-7 flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-5 py-4 transition ${
              isDragging
                ? "border-indigo-500 bg-indigo-50/70"
                : "border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-slate-50"
            } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processImageFile(file, docTypeHint, "upload");
              }}
            />
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
              {activeAction === "upload" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UploadCloud className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">
                {activeAction === "upload"
                  ? t.ocr.dropzoneProcessing
                  : t.ocr.dropzoneIdle}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                <span className="font-mono font-medium">JPG</span> /{" "}
                <span className="font-mono font-medium">PNG</span> /{" "}
                <span className="font-mono font-medium">WEBP</span>{" "}
                {t.ocr.dropzoneFormats}
              </p>
            </div>
          </div>

          {/* Demo Sample Buttons */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{t.ocr.demoTag}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleLoadSampleReceipt}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activeAction === "sample-receipt" ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                  <Receipt className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{t.ocr.demoReceiptBtn}</span>
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleLoadSampleCard}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activeAction === "sample-card" ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                  <Contact className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{t.ocr.demoCardBtn}</span>
              </button>
            </div>
          </div>
        </div>

        {/* OpenCV Preprocessing Toggle Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-indigo-600" />
            <div>
              <div className="text-xs font-semibold text-slate-800">
                {t.ocr.openCvToggleLabel}
              </div>
              <div className="text-[11px] text-slate-500">
                {t.ocr.openCvToggleHint}
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={useOpenCv}
            onClick={() => setUseOpenCv((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
              useOpenCv ? "bg-indigo-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                useOpenCv ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Preprocessing Result / Fallback Status Banner */}
        {preInfo && (
          <div
            className={`mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
              preInfo.mode === "opencv"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : preInfo.mode === "direct_fallback"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 font-medium">
              {preInfo.mode === "opencv" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              )}
              {preInfo.mode === "opencv"
                ? t.ocr.statusOpenCvApplied
                : preInfo.mode === "direct_fallback"
                  ? t.ocr.statusDirectFallback
                  : t.ocr.statusDirectManual}
            </span>

            {preInfo.mode === "opencv" && preInfo.metrics && (
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="rounded bg-white/80 px-2 py-0.5 ring-1 ring-emerald-200">
                  {t.ocr.metricsResolution}: {preInfo.metrics.resolution}
                </span>
                <span className="rounded bg-white/80 px-2 py-0.5 ring-1 ring-emerald-200">
                  {t.ocr.metricsSharpness}:{" "}
                  {preInfo.metrics.original_sharpness} →{" "}
                  {preInfo.metrics.processed_sharpness}
                </span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Preview + Extracted Table */}
      <div className="grid flex-1 gap-5 lg:grid-cols-12">
        {/* Image Preview */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ImageIcon className="h-4 w-4 shrink-0 text-indigo-600" />
              <span>{t.ocr.previewTitle}</span>
            </div>

            {preInfo?.processedImageDataUrl ? (
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewTab("original")}
                  className={`rounded px-2 py-0.5 font-medium transition ${
                    previewTab === "original"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.ocr.previewTabOriginal}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("enhanced")}
                  className={`rounded px-2 py-0.5 font-medium transition ${
                    previewTab === "enhanced"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.ocr.previewTabEnhanced}
                </button>
              </div>
            ) : (
              fileName && (
                <span className="max-w-[160px] truncate text-xs text-slate-400">
                  {fileName}
                </span>
              )
            )}
          </div>

          {activePreviewSrc ? (
            <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePreviewSrc}
                alt={fileName || t.ocr.previewTitle}
                className="max-h-[420px] w-auto rounded object-contain shadow-sm"
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
              <ImageIcon className="h-8 w-8 text-slate-300" />
              <p className="mt-2 px-4 text-xs leading-relaxed text-slate-400">
                {t.ocr.previewEmpty}
              </p>
            </div>
          )}
        </section>

        {/* Extracted Data Table */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <ScanText className="h-4 w-4 shrink-0 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                {t.ocr.resultTitle}
              </h3>
              {extraction && (
                <>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    {extraction.result.documentType === "receipt"
                      ? t.ocr.typeReceipt
                      : t.ocr.typeCard}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                      extraction.fallbackUsed
                        ? "border border-amber-200 bg-amber-50 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {extraction.fallbackUsed
                      ? `${t.common.fallbackBadgePrefix}: ${extraction.model}`
                      : `${t.common.modelBadge}: ${extraction.model}`}
                  </span>
                </>
              )}
            </div>

            {extraction && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.ocr.exportCsvBtn}</span>
              </button>
            )}
          </div>

          {isProcessing ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                {t.ocr.processingTitle}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t.ocr.processingDesc}
              </p>
            </div>
          ) : !extraction ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <ScanText className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-600">
                {t.ocr.emptyTitle}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                {t.ocr.emptyDesc}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
              {/* Primary Key-Value Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="w-44 border-b border-slate-200 px-4 py-2.5">
                        {t.ocr.tableColField}
                      </th>
                      <th className="border-b border-slate-200 px-4 py-2.5">
                        {t.ocr.tableColValue}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extraction.result.fields.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50/70">
                        <td className="bg-slate-50/40 px-4 py-2.5 text-xs font-medium text-slate-600">
                          {t.ocr.fieldLabels[row.key] || row.label}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-slate-900">
                          {row.value ? (
                            row.value
                          ) : (
                            <span className="text-xs text-slate-400">
                              {t.ocr.emptyValue}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Receipt Line Items Sub-Table */}
              {extraction.result.lineItems.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-slate-700">
                    {t.ocr.lineItemsTitle(extraction.result.lineItems.length)}
                  </h4>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-600">
                        <tr>
                          <th className="border-b border-slate-200 px-3 py-2">
                            {t.ocr.lineColName}
                          </th>
                          <th className="w-20 border-b border-slate-200 px-3 py-2 text-right">
                            {t.ocr.lineColQty}
                          </th>
                          <th className="w-28 border-b border-slate-200 px-3 py-2 text-right">
                            {t.ocr.lineColAmount}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {extraction.result.lineItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2 text-slate-800">
                              {item.name}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600">
                              {item.quantity || "1"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium text-slate-900">
                              {item.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Notes */}
              {extraction.result.notes && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">
                    {t.ocr.notesPrefix}
                  </span>
                  {extraction.result.notes}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
