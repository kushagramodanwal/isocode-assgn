import { createContext, useContext, useState, ReactNode } from 'react';
import { en } from './en.js';
import { hi } from './hi.js';

type Language = 'en' | 'hi';
type TranslationType = typeof en;

interface I18nContextType {
  lang: Language;
  t: TranslationType;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  t: en,
  setLanguage: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  const value: I18nContextType = {
    lang,
    t: lang === 'hi' ? hi : en,
    setLanguage: setLang,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
