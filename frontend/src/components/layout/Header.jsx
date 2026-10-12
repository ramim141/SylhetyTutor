import { Link } from "react-router-dom";
import { Sun, Moon, Laptop, Globe, User as UserIcon } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useThemeStore } from "../../store/themeStore";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/Button";
import { LanguageMenu } from "../ui/LanguageMenu";
import { Logo } from "../ui/Logo";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const { t, lang, setLang } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { user, status, logout } = useAuthStore();

  const cycleLang = () => {
    const next = { mixed: "bn", bn: "en", en: "mixed" };
    setLang(next[lang] || "mixed");
  };

  const cycleTheme = () => {
    const next = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    setTheme(next[theme] || "light");
  };

  const themeLabel = t("nav.themeCurrent", { name: t(`theme.${theme}`) });

  return (
    <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-15 md:h-18 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand logo */}
        <Link
          to="/"
          aria-label={t("brand.name")}
          className="flex items-center shrink-0 select-none active:scale-98 transition-transform"
        >
          <Logo className="h-9 md:h-10" />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            to="/"
            className="text-sm font-display font-semibold text-fg hover:text-navy-light transition-colors"
          >
            {t("nav.home")}
          </Link>
          <Link
            to="/tutors"
            className="text-sm font-display font-semibold text-fg-secondary hover:text-fg transition-colors"
          >
            {t("nav.findTutors")}
          </Link>
          <a
            href="/post-requirement"
            className="text-sm font-display font-semibold text-fg-secondary hover:text-fg transition-colors"
          >
            {t("nav.postRequirement")}
          </a>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageMenu />

          <NotificationBell />

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
        <div className="flex md:hidden items-center gap-2 shrink-0">
          {/* Account is the last tab of the bottom bar, so the bell takes this spot */}
          <NotificationBell />

          {/* Language Toggle Chip */}
          <button
            type="button"
            onClick={cycleLang}
            aria-label={`${t("nav.langSelect")}: ${t(`lang.${lang}`)}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display font-semibold text-fg-secondary hover:text-fg bg-bg-card border border-border/80 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Globe className="w-3.5 h-3.5 text-orange" />
            <span>{lang === "en" ? "EN" : lang === "bn" ? "বাং" : "Mix"}</span>
          </button>

          {/* Quick Theme Toggle */}
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={themeLabel}
            className="p-1.5 rounded-full text-fg-secondary hover:text-fg bg-bg-card border border-border/80 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            {theme === "light" && <Sun className="w-3.5 h-3.5 text-orange" />}
            {theme === "dark" && <Moon className="w-3.5 h-3.5 text-info" />}
            {theme === "system" && <Laptop className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
