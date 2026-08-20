import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { uz } from '../locales/uz';
import { en } from '../locales/en';
import { ru } from '../locales/ru';

export type Language = 'uz' | 'en' | 'ru';

const dictionaries = { uz, en, ru };

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (path: string) => any;
  dict: typeof uz;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('lang') as Language;
    if (saved === 'uz' || saved === 'en' || saved === 'ru') return saved;
    return 'uz';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  };

  const currentDict = dictionaries[lang] || uz;

  const t = useCallback(
    (path: string): any => {
      const keys = path.split('.');
      let current: any = currentDict;
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          // Fallback to Uzbek if key missing
          let fallback: any = uz;
          for (const fk of keys) {
            if (fallback && typeof fallback === 'object' && fk in fallback) {
              fallback = fallback[fk];
            } else {
              return path;
            }
          }
          return fallback;
        }
      }
      return current;
    },
    [currentDict],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dict: currentDict }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
