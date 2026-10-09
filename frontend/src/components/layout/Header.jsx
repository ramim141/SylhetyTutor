import React, { useState } from "react";
import { GraduationCap, Sun, Moon, Laptop, Menu, X } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "../ui/Button";

export function Header() {
  const { t, lang, setLang } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cycleTheme = () => {
    const next = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    setTheme(next[theme] || "light");
  };

  return (
    <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-18 flex items-center justify-between">
        {/* Brand Logo Wordmark */}
        <a href="/" className="flex items-center gap-2 group select-none">
          <div className="relative flex items-center">
            <span className="font-display font-extrabold text-2xl tracking-tight text-navy">
              Sylhety
            </span>
            <div className="relative inline-flex items-center">
              {/* Graduation Cap atop the 'T' */}
              <GraduationCap
                className="w-4 h-4 text-orange absolute -top-3 left-0 transition-transform group-hover:-rotate-12 duration-200"
                strokeWidth={2.5}
              />
              <span className="font-display font-extrabold text-2xl tracking-tight text-orange">
                Tutor
              </span>
            </div>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7">
          <a
            href="/"
            className="text-sm font-display font-semibold text-fg hover:text-navy-light transition-colors"
          >
            {t("nav.home")}
          </a>
          <a
            href="/tutors"
            className="text-sm font-display font-semibold text-fg-secondary hover:text-fg transition-colors"
          >
            {t("nav.findTutors")}
          </a>
          <a
            href="/post-requirement"
            className="text-sm font-display font-semibold text-fg-secondary hover:text-fg transition-colors"
          >
            {t("nav.postRequirement")}
          </a>
        </nav>

        {/* Actions: Trilingual Toggle + Theme Toggle + Auth */}
        <div className="hidden md:flex items-center gap-3">
          {/* Trilingual Pill Switcher */}
          <div
            role="radiogroup"
            aria-label="Language selection"
            className="inline-flex items-center p-1 bg-bg-subtle border border-border rounded-full text-xs font-display font-semibold"
          >
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                lang === "en"
                  ? "bg-orange text-on-orange shadow-xs"
                  : "text-fg-secondary hover:text-fg"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("bn")}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                lang === "bn"
                  ? "bg-orange text-on-orange shadow-xs"
                  : "text-fg-secondary hover:text-fg"
              }`}
            >
              বাং
            </button>
            <button
              onClick={() => setLang("mixed")}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                lang === "mixed"
                  ? "bg-orange text-on-orange shadow-xs"
                  : "text-fg-secondary hover:text-fg"
              }`}
            >
              Mixed
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={cycleTheme}
            title={`Current theme: ${theme} (click to toggle)`}
            className="p-2 text-fg-secondary hover:text-fg bg-bg-subtle border border-border rounded-md transition-colors cursor-pointer"
          >
            {theme === "light" && <Sun className="w-4 h-4 text-orange" />}
            {theme === "dark" && <Moon className="w-4 h-4 text-info" />}
            {theme === "system" && <Laptop className="w-4 h-4" />}
          </button>

          {/* Sign In Button */}
          <Button variant="ghost" size="sm">
            {t("nav.signIn")}
          </Button>

          {/* Primary Action Button */}
          <Button variant="primary" size="sm">
            {t("nav.becomeTutor")}
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={cycleTheme}
            className="p-2 text-fg-secondary bg-bg-subtle border border-border rounded-md cursor-pointer"
          >
            {theme === "light" ? <Sun className="w-4 h-4 text-orange" /> : <Moon className="w-4 h-4 text-info" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-fg hover:bg-bg-subtle rounded-md cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-bg-card p-4 space-y-4 shadow-lg animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-3">
            <a href="/" className="text-sm font-semibold text-fg py-1">
              {t("nav.home")}
            </a>
            <a href="/tutors" className="text-sm font-semibold text-fg-secondary py-1">
              {t("nav.findTutors")}
            </a>
            <a href="/post-requirement" className="text-sm font-semibold text-fg-secondary py-1">
              {t("nav.postRequirement")}
            </a>
          </nav>
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-fg-muted">Language:</span>
            <div className="inline-flex gap-1 bg-bg-subtle p-1 rounded-full border border-border">
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  lang === "en" ? "bg-orange text-on-orange" : "text-fg-secondary"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("bn")}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  lang === "bn" ? "bg-orange text-on-orange" : "text-fg-secondary"
                }`}
              >
                বাং
              </button>
              <button
                onClick={() => setLang("mixed")}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  lang === "mixed" ? "bg-orange text-on-orange" : "text-fg-secondary"
                }`}
              >
                Mixed
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1">
              {t("nav.signIn")}
            </Button>
            <Button variant="primary" className="flex-1">
              {t("nav.becomeTutor")}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
