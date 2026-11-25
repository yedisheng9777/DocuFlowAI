"use client";

import React, { useCallback, useState } from "react";
import {
  BookOpen,
  Cpu,
  Layers,
  Mail,
  ScanText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import RagWorkbench from "@/components/RagWorkbench";
import BusinessEmailWorkbench from "@/components/BusinessEmailWorkbench";
import OcrWorkbench from "@/components/OcrWorkbench";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/I18nProvider";

type ModuleId = "rag" | "email" | "ocr";

const MODULE_ICONS: Record<
  ModuleId,
  React.ComponentType<{ className?: string }>
> = {
  rag: BookOpen,
  email: Mail,
  ocr: ScanText,
};

const MODULE_ORDER: ModuleId[] = ["rag", "email", "ocr"];

export default function Home() {
  const { t } = useI18n();
  const [activeModule, setActiveModule] = useState<ModuleId>("rag");
  const [kbStatus, setKbStatus] = useState({ docCount: 0, chunkCount: 0 });

  const handleStatusChange = useCallback(
    (info: { docCount: number; chunkCount: number }) => {
      setKbStatus(info);
    },
    []
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-20 flex min-h-[3.5rem] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="whitespace-nowrap text-[15px] font-bold tracking-[-0.02em] text-slate-900">
              {t.common.appTitle}
            </h1>
            <span className="hidden truncate text-[13px] font-normal tracking-normal text-slate-500 lg:inline">
              {t.common.appSubtitle}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeModule === "rag" && (
            <span
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                kbStatus.chunkCount > 0
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-slate-100 text-slate-600 ring-slate-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  kbStatus.chunkCount > 0 ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              {kbStatus.chunkCount > 0
                ? t.rag.kbReady(kbStatus.docCount, kbStatus.chunkCount)
                : t.rag.kbWaiting}
            </span>
          )}
          <span className="hidden items-center gap-1 whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 xl:inline-flex">
            <Sparkles className="h-3 w-3" />
            Gemini 3.1 Flash Lite
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Body: Left Sidebar + Right Workspace */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Navigation Sidebar */}
        <aside className="flex w-full shrink-0 flex-col justify-between border-b border-slate-200 bg-white p-3 md:w-72 md:border-b-0 md:border-r">
          <div>
            <div className="px-2.5 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t.common.modulesHeading}
            </div>
            <nav className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:pb-0">
              {MODULE_ORDER.map((modId) => {
                const Icon = MODULE_ICONS[modId];
                const mod = t.modules[modId];
                const isActive = activeModule === modId;
                return (
                  <button
                    key={modId}
                    type="button"
                    onClick={() => setActiveModule(modId)}
                    className={`flex shrink-0 items-start gap-3 rounded-xl px-3 py-2.5 text-left transition md:w-full ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isActive ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <span
                        className={`block whitespace-nowrap text-[13.5px] leading-snug tracking-[-0.01em] md:whitespace-normal ${
                          isActive
                            ? "font-semibold text-indigo-800"
                            : "font-medium text-slate-700"
                        }`}
                      >
                        {mod.title}
                      </span>
                      <p className="mt-0.5 hidden text-xs font-normal leading-snug text-slate-500 md:block">
                        {mod.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Engine Info Footer */}
          <div className="mt-4 hidden rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 md:block">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Cpu className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
              <span>{t.common.engineTitle}</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-500">
              <li>• {t.common.enginePrimaryModel}</li>
              <li>• {t.common.engineEmbedModel}</li>
              <li className="flex items-start gap-1 text-emerald-700">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{t.common.engineResilience}</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Right Main Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto flex h-full max-w-5xl flex-col">
            {activeModule === "rag" && (
              <RagWorkbench onStatusChange={handleStatusChange} />
            )}
            {activeModule === "email" && <BusinessEmailWorkbench />}
            {activeModule === "ocr" && <OcrWorkbench />}
          </div>
        </main>
      </div>
    </div>
  );
}
