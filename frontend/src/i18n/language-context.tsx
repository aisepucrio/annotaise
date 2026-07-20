'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Language } from './types';

type LanguageContextValue = {
  language: Language;
  setLanguage: (next: Language) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'annotaise-language';
const DEFAULT_LANGUAGE: Language = 'pt-BR';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const languageParam = new URLSearchParams(window.location.search).get('lang');
    if (languageParam === 'pt-BR' || languageParam === 'en') {
      setLanguageState(languageParam);
      setHydrated(true);
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'pt-BR' || stored === 'en') {
      setLanguageState(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language, hydrated]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (next) => setLanguageState(next),
      toggleLanguage: () => setLanguageState((prev) => (prev === 'pt-BR' ? 'en' : 'pt-BR')),
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
