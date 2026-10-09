import { create } from "zustand";

export type LanguageMode = "en" | "bn" | "mixed";

interface LanguageState {
  lang: LanguageMode;
  setLang: (lang: LanguageMode) => void;
}

const savedLang =
  (typeof window !== "undefined" &&
    (localStorage.getItem("sylhetytutor_lang") as LanguageMode)) ||
  "mixed";

export const useLanguageStore = create<LanguageState>((set) => ({
  lang: savedLang,
  setLang: (lang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sylhetytutor_lang", lang);
      document.documentElement.lang = lang === "en" ? "en" : "bn";
    }
    set({ lang });
  },
}));
