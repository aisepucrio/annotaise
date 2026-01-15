"use client";

import { useCallback, useMemo } from "react";
import { useLanguage } from "./language-context";
import { translations } from "./translations";

export type TranslateParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslateParams) {
  if (!params) return template;
  return Object.keys(params).reduce((result, key) => {
    const value = String(params[key]);
    return result.replaceAll(`{{${key}}}`, value);
  }, template);
}

export function useTranslations() {
  const { language } = useLanguage();
  const locale = useMemo(
    () => (language === "en" ? "en-US" : "pt-BR"),
    [language]
  );

  const t = useCallback(
    (key: string, params?: TranslateParams) => {
      const fallback = translations["pt-BR"][key];
      const template = translations[language]?.[key] ?? fallback ?? key;
      return interpolate(template, params);
    },
    [language]
  );

  return useMemo(() => ({ t, language, locale }), [t, language, locale]);
}
