"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Check,
  ClipboardList,
  Copy,
  Loader2,
  Mail,
  Send,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import MeetingMinutesPanel from "@/components/MeetingMinutesPanel";

type RecipientRole = "external_client" | "internal_manager" | "colleague";

interface GeneratedEmail {
  subject: string;
  recipientLine: string;
  greeting: string;
  body: string;
  closing: string;
  fullEmail: string;
  keigoPoints: string[];
}

const ROLE_IDS: RecipientRole[] = [
  "external_client",
  "internal_manager",
  "colleague",
];

const ROLE_ICONS: Record<
  RecipientRole,
  React.ComponentType<{ className?: string }>
> = {
  external_client: Building2,
  internal_manager: UserCheck,
  colleague: Users,
};

export default function BusinessEmailWorkbench() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"compose" | "minutes">("compose");
  const [recipientRole, setRecipientRole] =
    useState<RecipientRole>("internal_manager");
  const [senderName, setSenderName] = useState("");
  const [requirement, setRequirement] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    email: GeneratedEmail;
    model: string;
    primaryModel: string;
    fallbackUsed: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate(customReq?: string, customRole?: RecipientRole) {
    const reqText = (customReq ?? requirement).trim();
    const targetRole = customRole ?? recipientRole;
    if (!reqText || isGenerating) return;

    setError(null);
    setIsGenerating(true);
    setCopied(false);

    try {
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirement: reqText,
          recipientRole: targetRole,
          senderName: senderName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t.email.errorFallback);
      }

      setResult({
        email: data.email,
        model: data.model,
        primaryModel: data.primaryModel,
        fallbackUsed: Boolean(data.fallbackUsed),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.email.errorFallback);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.email.fullEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t.email.copyError);
    }
  }

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Module Header + Sub-Tab Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
              {t.modules.email.badge}
            </span>
            <h2 className="text-lg font-semibold text-slate-900">
              {t.email.heading}
            </h2>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {t.email.description}
          </p>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div
        role="tablist"
        aria-label="Module 2 Sub-tabs"
        className="inline-flex w-fit flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "compose"}
          onClick={() => setActiveTab("compose")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === "compose"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span>{t.email.tabs.compose}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "minutes"}
          onClick={() => setActiveTab("minutes")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === "minutes"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5 shrink-0" />
          <span>{t.email.tabs.minutes}</span>
        </button>
      </div>

      {activeTab === "minutes" ? (
        <MeetingMinutesPanel />
      ) : (
        <div className="grid flex-1 gap-5 lg:grid-cols-12">
        {/* Left Input Form */}
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
          {/* Recipient Role Selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700">
              {t.email.step1Label}
            </label>
            <div className="grid gap-2">
              {ROLE_IDS.map((roleId) => {
                const Icon = ROLE_ICONS[roleId];
                const roleCopy = t.email.roles[roleId];
                const active = recipientRole === roleId;
                return (
                  <button
                    key={roleId}
                    type="button"
                    onClick={() => setRecipientRole(roleId)}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                      active
                        ? "border-indigo-500 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-500/20"
                        : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        active ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{roleCopy.title}</div>
                      <div className="text-[11px] leading-snug text-slate-500">
                        {roleCopy.hint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preset Scenarios */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
              <span>{t.email.step2Label}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.email.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setRecipientRole(preset.role);
                    setRequirement(preset.requirement);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs font-medium leading-snug text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {preset.badge}
                </button>
              ))}
            </div>
          </div>

          {/* Sender Name (Optional) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {t.email.senderLabel}
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder={t.email.senderPlaceholder}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Plain-language Requirement */}
          <div className="flex flex-1 flex-col">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {t.email.step3Label}
            </label>
            <textarea
              rows={5}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder={t.email.requirementPlaceholder}
              className="min-h-[120px] w-full flex-1 resize-none rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
            disabled={isGenerating || requirement.trim().length === 0}
            onClick={() => handleGenerate()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span>{t.email.generatingButton}</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 shrink-0" />
                <span>{t.email.generateButton}</span>
              </>
            )}
          </button>
        </section>

        {/* Right Preview Card */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                {t.email.previewTitle}
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
                onClick={handleCopy}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>{t.email.copiedButton}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{t.email.copyButton}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {!result ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Briefcase className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">
                {t.email.emptyTitle}
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                {t.email.emptyDesc}
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-1 flex-col gap-3">
              {/* Structured Email Sections */}
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="grid grid-cols-[84px_1fr] gap-3 px-4 py-3 text-sm">
                  <span className="text-xs font-semibold text-slate-500">
                    {t.email.fields.subject}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {result.email.subject}
                  </span>
                </div>
                <div className="grid grid-cols-[84px_1fr] gap-3 px-4 py-3 text-sm">
                  <span className="text-xs font-semibold text-slate-500">
                    {t.email.fields.recipientLine}
                  </span>
                  <span className="whitespace-pre-wrap text-slate-800">
                    {result.email.recipientLine}
                  </span>
                </div>
                <div className="grid grid-cols-[84px_1fr] gap-3 px-4 py-3 text-sm">
                  <span className="text-xs font-semibold text-slate-500">
                    {t.email.fields.greeting}
                  </span>
                  <span className="whitespace-pre-wrap text-slate-800">
                    {result.email.greeting}
                  </span>
                </div>
                <div className="grid grid-cols-[84px_1fr] gap-3 px-4 py-3 text-sm">
                  <span className="text-xs font-semibold text-slate-500">
                    {t.email.fields.body}
                  </span>
                  <span className="whitespace-pre-wrap leading-relaxed text-slate-800">
                    {result.email.body}
                  </span>
                </div>
                <div className="grid grid-cols-[84px_1fr] gap-3 px-4 py-3 text-sm">
                  <span className="text-xs font-semibold text-slate-500">
                    {t.email.fields.closing}
                  </span>
                  <span className="whitespace-pre-wrap text-slate-800">
                    {result.email.closing}
                  </span>
                </div>
              </div>

              {/* Keigo Notes */}
              {result.email.keigoPoints.length > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>{t.email.keigoNotesTitle}</span>
                  </div>
                  <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-slate-700">
                    {result.email.keigoPoints.map((pt, idx) => (
                      <li key={idx}>• {pt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      )}
    </div>
  );
}
