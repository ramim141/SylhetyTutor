import { en } from "./en";
import { bn } from "./bn";
import { mixed } from "./mixed";
import { useLanguageStore } from "../store/languageStore";

const translations = {
  en,
  bn,
  mixed,
};

function lookup(lang, key) {
  const dict = translations[lang] || translations.mixed;
  return dict[key] ?? translations.mixed[key];
}

/** "Try again in {seconds} seconds" + { seconds: 30 } */
function interpolate(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? params[name] : match));
}

export function useTranslation() {
  const { lang, setLang } = useLanguageStore();

  const t = (key, params) => {
    const text = lookup(lang, key);
    return text === undefined ? key : interpolate(text, params);
  };

  // For optional keys (e.g. server error codes): unlike t(), never shows the raw key
  const has = (key) => lookup(lang, key) !== undefined;

  return { t, has, lang, setLang };
}

export { en, bn, mixed };
