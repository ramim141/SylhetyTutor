import { create } from "zustand";

const savedLang =
  (typeof window !== "undefined" &&
    localStorage.getItem("sylhetytutor_lang")) ||
  "mixed";

export const useLanguageStore = create((set) => ({
  lang: savedLang,
  setLang: (lang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sylhetytutor_lang", lang);
      document.documentElement.lang = lang === "en" ? "en" : "bn";
    }
    set({ lang });
  },
}));
