import { useState } from 'react';
import type { ReactNode } from 'react';
import { LanguageContext, translations, type Lang } from './lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}
