"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  ListTodo,
  Loader2,
  Sparkles,
} from "lucide-react";
import { MEETING_SAMPLES } from "@/lib/sample-meetings";
import { useI18n } from "@/components/I18nProvider";

interface MeetingActionItem {
  task: string;
  assignee: string;
  deadline: string;
  priority: "高" | "中" | "低";
}

interface ExtractedMinutes {
  meetingTitle: string;
  summary: string[];
  decisions: string[];
  actionItems: MeetingActionItem[];
}

function escapeMarkdownCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export default function MeetingMinutesPanel() {
  const { t } = useI18n();
  const [transcript, setTranscript] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);

  const [result, setResult] = useState<{
    minutes: ExtractedMinutes;
    model: string;
    primaryModel: string;
    fallbackUsed: boolean;
  } | null>(null);

  async function handleExtract(customText?: string) {
    const text = (customText ?? transcript).trim();
    if (!text || isExtracting) return;

    setError(null);
    setIsExtracting(true);
    setCopiedMd(false);

    try {
      const res = await fetch("/api/meeting/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t.meeting.errorFallback);
      }

      setResult({
        minutes: data.minutes,
        model: data.model,
        primaryModel: data.primaryModel,
        fallbackUsed: Boolean(data.fallbackUsed),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.meeting.errorFallback);
    } finally {
      setIsExtracting(false);
    }
  }

  function buildMarkdown(): string {
    if (!result) return "";
    const { minutes } = result;
    const lines: string[] = [];

    lines.push(`# ${minutes.meetingTitle}`);
    lines.push("");
    lines.push(`## ${t.meeting.summaryHeading}`);
    if (minutes.summary.length > 0) {
      for (const s of minutes.summary) {
        lines.push(`- ${s}`);
      }
    } else {
      lines.push(`- ${t.meeting.emptyListFallback}`);
    }

    lines.push("");
    lines.push(`## ${t.meeting.decisionsHeading}`);
    if (minutes.decisions.length > 0) {
      for (const d of minutes.decisions) {
        lines.push(`- ${d}`);
      }
    } else {
      lines.push(`- ${t.meeting.emptyListFallback}`);
    }

    lines.push("");
    lines.push(`## ${t.meeting.todoHeading}`);
    if (minutes.actionItems.length > 0) {
      lines.push(
        `| ${t.meeting.todoCols.task} | ${t.meeting.todoCols.assignee} | ${t.meeting.todoCols.deadline} | ${t.meeting.todoCols.priority} |`
      );
      lines.push("| --- | --- | --- | --- |");
      for (const item of minutes.actionItems) {
        const priorityLabel =
          t.meeting.priorityLabels[item.priority] || item.priority;
        lines.push(
          `| ${escapeMarkdownCell(item.task)} | ${escapeMarkdownCell(
            item.assignee
          )} | ${escapeMarkdownCell(item.deadline)} | ${escapeMarkdownCell(
            priorityLabel
          )} |`
        );
      }
    } else {
      lines.push(`- ${t.meeting.emptyListFallback}`);
    }

    return lines.join("\n");
  }

  async function handleCopyMarkdown() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      setError(t.meeting.copyError);
    }
  }

  return (
    <div className="grid flex-1 gap-5 lg:grid-cols-12">
      {/* Left Input Column */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
        <p className="text-xs leading-relaxed text-slate-500">
          {t.meeting.description}
        </p>

        {/* 1-Click Sample Presets */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
            <span>{t.meeting.samplesLabel}</span>
          </div>
          <div className="grid gap-2">
            {(["project-weekly", "client-requirements"] as const).map(
              (sampleId) => (
                <button
                  key={sampleId}
                  type="button"
                  onClick={() => {
                    const sample = MEETING_SAMPLES[sampleId];
                    if (sample) setTranscript(sample.transcript);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-left text-xs font-medium text-indigo-800 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                  <span>{t.meeting.sampleButtons[sampleId]}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Meeting Transcript Textarea */}
        <div className="flex flex-1 flex-col">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            {t.meeting.inputLabel}
          </label>
          <textarea
            rows={10}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={t.meeting.inputPlaceholder}
            className="min-h-[220px] w-full flex-1 resize-none rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          disabled={isExtracting || transcript.trim().length === 0}
          onClick={() => handleExtract()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <span>{t.meeting.extractingButton}</span>
            </>
          ) : (
            <>
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span>{t.meeting.extractButton}</span>
            </>
          )}
        </button>
      </section>

      {/* Right Structured Output Column */}
      <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <ListTodo className="h-4 w-4 shrink-0 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              {t.meeting.resultTitle}
            </h3>
            {result && (
              <span
                className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                  result.fallbackUsed
                    ? "border border-amber-200 bg-amber-50 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {result.fallbackUsed
                  ? `${t.common.fallbackBadgePrefix}: ${result.model}`
                  : `${t.common.modelBadge}: ${result.model}`}
              </span>
            )}
          </div>

          {result && (
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                copiedMd
                  ? "bg-emerald-600 text-white"
                  : "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              {copiedMd ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{t.meeting.copiedMarkdownButton}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{t.meeting.copyMarkdownButton}</span>
                </>
              )}
            </button>
          )}
        </div>

        {!result ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">
              {t.meeting.emptyTitle}
            </p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              {t.meeting.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto">
            {/* Meeting Title */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
              <h4 className="text-sm font-semibold text-slate-900">
                {result.minutes.meetingTitle}
              </h4>
            </div>

            {/* 1. Meeting Summary (<= 3 items) */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>{t.meeting.summaryHeading}</span>
              </h4>
              {result.minutes.summary.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-700">
                  {result.minutes.summary.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-400">
                  {t.meeting.emptyListFallback}
                </p>
              )}
            </div>

            {/* 2. Decisions */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{t.meeting.decisionsHeading}</span>
              </h4>
              {result.minutes.decisions.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-700">
                  {result.minutes.decisions.map((decision, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{decision}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-400">
                  {t.meeting.emptyListFallback}
                </p>
              )}
            </div>

            {/* 3. Action Items / ToDo Table */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <ListTodo className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                <span>{t.meeting.todoHeading}</span>
              </h4>
              {result.minutes.actionItems.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="border-b border-slate-200 px-3 py-2.5">
                          {t.meeting.todoCols.task}
                        </th>
                        <th className="w-28 border-b border-slate-200 px-3 py-2.5">
                          {t.meeting.todoCols.assignee}
                        </th>
                        <th className="w-32 border-b border-slate-200 px-3 py-2.5">
                          {t.meeting.todoCols.deadline}
                        </th>
                        <th className="w-20 border-b border-slate-200 px-3 py-2.5 text-center">
                          {t.meeting.todoCols.priority}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.minutes.actionItems.map((row, idx) => {
                        const priorityBadge =
                          row.priority === "高"
                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                            : row.priority === "低"
                              ? "bg-slate-100 text-slate-600 ring-slate-200"
                              : "bg-amber-50 text-amber-700 ring-amber-200";
                        return (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2.5 leading-relaxed text-slate-900">
                              {row.task}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-700">
                              {row.assignee}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                              {row.deadline}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${priorityBadge}`}
                              >
                                {t.meeting.priorityLabels[row.priority]}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">
                  {t.meeting.emptyListFallback}
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
