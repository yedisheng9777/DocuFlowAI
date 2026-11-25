"use client";

import React from "react";
import { Globe } from "lucide-react";
import { LOCALE_OPTIONS } from "@/lib/i18n";
import { useI18n } from "@/components/I18nProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100/80 p-0.5"
    >
      <Globe className="ml-1.5 mr-1 hidden h-3.5 w-3.5 text-slate-400 sm:block" />
      {LOCALE_OPTIONS.map((opt) => {
        const active = locale === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLocale(opt.code)}
            aria-pressed={active}
            className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition ${
              active
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
