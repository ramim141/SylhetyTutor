import { en } from "./en";
import type { TranslationKeys } from "./en";
import { bn } from "./bn";
import { mixed } from "./mixed";
import { useLanguageStore } from "../store/languageStore";

const translations = {
  en,
  bn,
  mixed,
};

export function useTranslation() {
  const { lang, setLang } = useLanguageStore();

  const t = (key: TranslationKeys): string => {
    const dict = translations[lang] || translations.mixed;
    return dict[key] || translations.mixed[key] || key;
  };

  return { t, lang, setLang };
}

export { en, bn, mixed };
export type { TranslationKeys };
