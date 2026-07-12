import { useState } from 'react';
import type { ReactNode } from 'react';
import { LanguageContext, translations, type Lang } from './lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return localStorage.getItem('lbma-lang') === 'es' ? 'es' : 'en';
    } catch {
      return 'en';
    }
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('lbma-lang', l);
    } catch {
      /* storage unavailable */
    }
  };
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}
