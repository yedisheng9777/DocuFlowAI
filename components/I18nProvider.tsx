"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DICTIONARIES, I18nDictionary, Locale } from "@/lib/i18n";

const STORAGE_KEY = "docuflow_locale";

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: I18nDictionary;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  setLocale: () => {},
  t: DICTIONARIES.zh,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "ja" || saved === "zh" || saved === "en") {
        setLocaleState(saved);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    const htmlLang =
      locale === "ja" ? "ja" : locale === "en" ? "en" : "zh-CN";
    document.documentElement.lang = htmlLang;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: DICTIONARIES[locale],
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
