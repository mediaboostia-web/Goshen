'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { TRANSLATIONS, type Locale } from '@/lib/i18n/translations';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, fallback?: string) => string;
  isFrench: boolean;
  isEnglish: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY_LANG = 'goshen_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG) as Locale | null;
      if (saved === 'fr' || saved === 'en') {
        setLocaleState(saved);
      }
    } catch {
      // localStorage not accessible
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY_LANG, newLocale);
      document.documentElement.lang = newLocale;
    } catch {
      // ignore
    }
  };

  const toggleLocale = () => {
    setLocale(locale === 'fr' ? 'en' : 'fr');
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS.fr;
    return dict[key] ?? fallback ?? key;
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        toggleLocale,
        t,
        isFrench: locale === 'fr',
        isEnglish: locale === 'en',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      locale: 'fr',
      setLocale: () => {},
      toggleLocale: () => {},
      t: (key: string, fallback?: string) => TRANSLATIONS.fr[key] ?? fallback ?? key,
      isFrench: true,
      isEnglish: false,
    };
  }
  return ctx;
}
