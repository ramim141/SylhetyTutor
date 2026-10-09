import { create } from "zustand";

function applyTheme(theme) {
  const root = document.documentElement;
  let effectiveTheme = theme;
  if (theme === "system") {
    effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  root.dataset.theme = effectiveTheme;
  localStorage.setItem("sylhetytutor_theme", theme);
}

const initialTheme =
  (typeof window !== "undefined" &&
    localStorage.getItem("sylhetytutor_theme")) ||
  "system";

export const useThemeStore = create((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));

if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      const current = localStorage.getItem("sylhetytutor_theme") || "system";
      if (current === "system") {
        document.documentElement.dataset.theme = e.matches ? "dark" : "light";
      }
    });
}
