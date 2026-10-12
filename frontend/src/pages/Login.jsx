import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, User, Lock, Sun, Moon, Laptop, Globe, ShieldCheck } from "lucide-react";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Logo } from "../components/ui/Logo";
import { getFieldErrors, getFormError } from "../api/errors";
import { getReturnTo, keepReturnTo } from "../utils/returnTo";

const CURRENT_YEAR = new Date().getFullYear();

export default function Login() {
  const i18n = useTranslation();
  const { t, lang, setLang } = i18n;
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const returnTo = getReturnTo(location);

  const cycleTheme = () => {
    const next = { light: "dark", dark: "system", system: "light" };
    setTheme(next[theme] || "light");
  };

  const cycleLang = () => {
    const next = { mixed: "bn", bn: "en", en: "mixed" };
    setLang(next[lang] || "mixed");
  };

  const validate = () => {
    const newErrors = {};
    const trimmedId = identifier.trim();

    if (!trimmedId) {
      newErrors.identifier = t("error.identifier.required");
    }

    if (!password) {
      newErrors.password = t("error.password.required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setLoading(true);
    try {
      await login({
        identifier: identifier.trim(),
        password,
      });
      navigate(returnTo, { replace: true });
    } catch (err) {
      setServerError(getFormError(err, i18n) || "");
      setErrors(getFieldErrors(err, i18n));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-fg flex flex-col justify-between py-6 px-4 sm:px-6 relative overflow-hidden transition-colors selection:bg-orange/20 selection:text-orange-text">
      {/* Subtle ambient lighting for premium minimal feel */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-orange/10 via-orange/5 to-transparent blur-3xl rounded-full"
        aria-hidden="true"
      />

      {/* Top Bar: Back to Home + Quick Preferences */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-medium text-fg-secondary hover:text-fg bg-bg-subtle/80 hover:bg-bg-subtle border border-border/80 transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t("nav.home")}</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Language Toggle Chip */}
          <button
            type="button"
            onClick={cycleLang}
            aria-label="Toggle language"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-semibold text-fg-secondary hover:text-fg bg-bg-subtle border border-border/80 transition-all cursor-pointer active:scale-95"
          >
            <Globe className="w-3.5 h-3.5 text-orange" />
            <span>{lang === "en" ? "EN" : lang === "bn" ? "বাং" : "Mix"}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={cycleTheme}
            aria-label="Toggle theme"
            className="p-1.5 rounded-full text-fg-secondary hover:text-fg bg-bg-subtle border border-border/80 transition-all cursor-pointer active:scale-95"
          >
            {theme === "light" && <Sun className="w-3.5 h-3.5 text-orange" />}
            {theme === "dark" && <Moon className="w-3.5 h-3.5 text-info" />}
            {theme === "system" && <Laptop className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Centered Minimal Card */}
      <main className="w-full max-w-[420px] mx-auto my-auto z-10 py-6">
        <div className="bg-bg-card border border-border/80 rounded-2xl shadow-xl shadow-navy/5 p-6 sm:p-8 backdrop-blur-sm transition-all">
          {/* Brand & Heading */}
          <div className="flex flex-col items-center text-center mb-6">
            <Link
              to="/"
              className="inline-flex items-center select-none active:scale-98 transition-transform mb-4"
              aria-label={t("brand.name")}
            >
              <Logo className="h-10 sm:h-11" />
            </Link>

            <h1 className="text-xl sm:text-2xl font-display font-extrabold text-fg tracking-tight">
              {t("auth.login.title")}
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-body text-fg-secondary max-w-xs">
              {t("auth.login.subtitle")}
            </p>
          </div>

          {/* Error Alert */}
          {serverError && (
            <Alert variant="error" className="mb-5" onClose={() => setServerError("")}>
              {serverError}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="identifier"
              label={t("auth.identifier.label")}
              placeholder={t("auth.identifier.placeholder")}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: null }));
              }}
              error={errors.identifier}
              leftIcon={User}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              required
              disabled={loading}
              className="space-y-1"
            />

            <PasswordInput
              id="password"
              label={t("auth.password.label")}
              placeholder={t("auth.password.placeholder")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              error={errors.password}
              leftIcon={Lock}
              autoComplete="current-password"
              enterKeyHint="go"
              required
              disabled={loading}
              className="space-y-1"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-display font-semibold text-sm tracking-wide bg-gradient-to-r from-orange via-orange to-orange-hover shadow-md shadow-orange/25 hover:shadow-lg hover:shadow-orange/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2"
              loading={loading}
            >
              <span>{t("auth.submit.login")}</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Button>
          </form>

          {/* Footer Divider & Register link */}
          <div className="mt-6 pt-5 border-t border-border/80 text-center">
            <p className="text-xs sm:text-sm font-body text-fg-secondary">
              <Link
                to="/register"
                state={keepReturnTo(location)}
                className="font-display font-semibold text-orange-text hover:text-orange transition-colors inline-flex items-center gap-1 group"
              >
                <span>{t("auth.noAccount")}</span>
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge at bottom */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-fg-muted font-display select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span>SylhetyTutor &middot; Verified &amp; Secure Platform</span>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="text-center text-[11px] text-fg-muted/70 font-display py-2">
        &copy; {CURRENT_YEAR} SylhetyTutor. All rights reserved.
      </footer>
    </div>
  );
}
