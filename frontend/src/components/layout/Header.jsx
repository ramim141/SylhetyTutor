import React, { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Sun, Moon, Laptop, Globe, User as UserIcon } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useThemeStore } from "../../store/themeStore";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/Button";
import { BottomSheet } from "../ui/BottomSheet";

export function Header() {
  const { t, lang, setLang } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { user, status, logout } = useAuthStore();
  const [langSheetOpen, setLangSheetOpen] = useState(false);

  const cycleTheme = () => {
    const next = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    setTheme(next[theme] || "light");
  };

  const langNames = { en: t("lang.en"), bn: t("lang.bn"), mixed: t("lang.mixed") };
  const themeLabel = `${t("theme." + theme)}`;

  return (
    <>
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border transition-colors">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-15 md:h-18 flex items-center justify-between">
          {/* Brand Logo Wordmark */}
          <Link to="/" className="flex items-center gap-1.5 select-none active:scale-98 transition-transform">
            <div className="relative flex items-center">
              <span className="font-display font-extrabold text-xl md:text-2xl tracking-tight text-navy">
                Sylhety
              </span>
              <div className="relative inline-flex items-center">
                <GraduationCap
                  className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange absolute -top-2.5 md:-top-3 left-0"
                  strokeWidth={2.5}
                />
                <span className="font-display font-extrabold text-xl md:text-2xl tracking-tight text-orange">
                  Tutor
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7">
            <Link
              to="/"
              className="text-sm font-display font-semibold text-fg hover:text-navy-light transition-colors"
            >
              {t("nav.home")}
            </Link>
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

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Trilingual Pill Switcher */}
            <div
              role="radiogroup"
              aria-label={t("nav.langSelect")}
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
              type="button"
              onClick={cycleTheme}
              aria-label={themeLabel}
              title={themeLabel}
              className="p-2 text-fg-secondary hover:text-fg bg-bg-subtle border border-border rounded-md transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-orange/30"
            >
              {theme === "light" && <Sun className="w-4 h-4 text-orange" />}
              {theme === "dark" && <Moon className="w-4 h-4 text-info" />}
              {theme === "system" && <Laptop className="w-4 h-4" />}
            </button>

            {status === "authenticated" && user ? (
              <div className="flex items-center gap-2">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="font-display font-semibold">
                    <UserIcon className="w-4 h-4 mr-1 text-orange" />
                    <span>{user.full_name?.split(" ")[0] || t("dashboard.title")}</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="text-xs"
                >
                  {t("auth.logout")}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    {t("nav.signIn")}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    {t("nav.becomeTutor")}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile App Top Right Quick Actions */}
          <div className="flex md:hidden items-center gap-2">
            {status === "authenticated" && (
              <Link
                to="/dashboard"
                aria-label={t("dashboard.title")}
                className="p-2 text-fg-secondary bg-bg-subtle border border-border rounded-full cursor-pointer active:scale-95 transition-transform"
              >
                <UserIcon className="w-4 h-4 text-orange" />
              </Link>
            )}

            {/* Quick Language Chip */}
            <button
              type="button"
              onClick={() => setLangSheetOpen(true)}
              aria-label={t("nav.langSelect")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-bg-subtle border border-border text-xs font-display font-bold text-fg cursor-pointer active:scale-95 transition-transform"
            >
              <Globe className="w-3.5 h-3.5 text-orange" />
              <span>{lang === "en" ? "EN" : lang === "bn" ? "বাং" : "Mix"}</span>
            </button>

            {/* Quick Theme Toggle */}
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={themeLabel}
              className="p-2 text-fg-secondary bg-bg-subtle border border-border rounded-full cursor-pointer active:scale-95 transition-transform"
            >
              {theme === "light" ? (
                <Sun className="w-4 h-4 text-orange" />
              ) : theme === "dark" ? (
                <Moon className="w-4 h-4 text-info" />
              ) : (
                <Laptop className="w-4 h-4 text-fg" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Language Selection Bottom Sheet on Mobile */}
      <BottomSheet
        isOpen={langSheetOpen}
        onClose={() => setLangSheetOpen(false)}
        title={t("nav.langSelect")}
      >
        <div className="space-y-2.5">
          {["mixed", "bn", "en"].map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setLang(mode);
                setLangSheetOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-sm font-display font-semibold transition-all cursor-pointer ${
                lang === mode
                  ? "bg-orange-light border-orange text-orange-text shadow-xs"
                  : "bg-bg-subtle border-border text-fg hover:bg-bg-card"
              }`}
            >
              <span>{langNames[mode]}</span>
              {lang === mode && (
                <span className="w-2.5 h-2.5 rounded-full bg-orange" />
              )}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
