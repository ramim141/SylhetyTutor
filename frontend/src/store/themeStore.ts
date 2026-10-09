import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
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

const initialTheme: Theme =
  (typeof window !== "undefined" &&
    (localStorage.getItem("sylhetytutor_theme") as Theme)) ||
  "system";

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));

// Listen for system theme changes if set to 'system'
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
