import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, ArrowLeft, UserCheck, BookOpen, Sun, Moon, Laptop, Globe, ShieldCheck } from "lucide-react";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { getFieldErrors, getFormError } from "../api/errors";

const CURRENT_YEAR = new Date().getFullYear();

export default function Register() {
  const i18n = useTranslation();
  const { t, lang, setLang } = i18n;
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);

  const [role, setRole] = useState("guardian");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

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

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = t("error.fullName.short");
    }

    const cleanPhone = phone.trim().replace(/[\s-]/g, "");
    if (!cleanPhone && !email.trim()) {
      newErrors.phone = t("error.phone.required");
    } else if (cleanPhone) {
      const bdPhoneRegex = /^(?:\+?880|0)?1[3-9]\d{8}$/;
      if (!bdPhoneRegex.test(cleanPhone)) {
        newErrors.phone = t("error.phone.invalid");
      }
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = t("error.email.invalid");
      }
    }

    if (!password || password.length < 8) {
      newErrors.password = t("error.password.password_too_short");
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
      await register({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() ? email.trim().toLowerCase() : undefined,
        password,
        role,
        preferred_language: lang,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(getFormError(err, i18n) || "");
      setErrors(getFieldErrors(err, i18n));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-fg flex flex-col justify-between py-6 px-4 sm:px-6 relative overflow-hidden transition-colors selection:bg-orange/20 selection:text-orange-text">
      {/* Subtle ambient lighting */}
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
      <main className="w-full max-w-[460px] mx-auto my-auto z-10 py-6">
        <div className="bg-bg-card border border-border/80 rounded-2xl shadow-xl shadow-navy/5 p-6 sm:p-8 backdrop-blur-sm transition-all">
          {/* Brand & Heading */}
          <div className="flex flex-col items-center text-center mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 select-none active:scale-98 transition-transform mb-3"
              aria-label="SylhetyTutor Home"
            >
              <span className="font-display font-black text-2xl sm:text-3xl tracking-tight text-navy">
                Sylhety
              </span>
              <div className="relative inline-flex items-center">
                <GraduationCap
                  className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-orange absolute -top-3 left-0"
                  strokeWidth={2.5}
                />
                <span className="font-display font-black text-2xl sm:text-3xl tracking-tight text-orange">
                  Tutor
                </span>
              </div>
            </Link>

            <h1 className="text-xl sm:text-2xl font-display font-extrabold text-fg tracking-tight">
              {t("auth.register.title")}
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-body text-fg-secondary max-w-xs">
              {t("auth.register.subtitle")}
            </p>
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <Alert variant="error" className="mb-5" onClose={() => setServerError("")}>
              {serverError}
            </Alert>
          )}

          {/* Role selector switcher */}
          <div className="mb-5">
            <label className="block text-xs font-display font-bold text-fg mb-1.5">
              {t("auth.role.label")}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole("guardian")}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all text-left cursor-pointer active:scale-98 ${
                  role === "guardian"
                    ? "border-orange bg-orange/5 ring-2 ring-orange/20 shadow-xs"
                    : "border-border/80 hover:border-fg-muted/40 bg-bg-subtle/50"
                }`}
              >
                <div className="flex items-center gap-1.5 font-display font-bold text-xs sm:text-sm text-fg">
                  <UserCheck
                    className={`w-4 h-4 ${role === "guardian" ? "text-orange" : "text-fg-secondary"}`}
                  />
                  <span>{t("auth.role.guardian")}</span>
                </div>
                <span className="text-[11px] font-body text-fg-secondary line-clamp-1">
                  {t("auth.role.guardian.desc")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole("tutor")}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all text-left cursor-pointer active:scale-98 ${
                  role === "tutor"
                    ? "border-orange bg-orange/5 ring-2 ring-orange/20 shadow-xs"
                    : "border-border/80 hover:border-fg-muted/40 bg-bg-subtle/50"
                }`}
              >
                <div className="flex items-center gap-1.5 font-display font-bold text-xs sm:text-sm text-fg">
                  <BookOpen
                    className={`w-4 h-4 ${role === "tutor" ? "text-orange" : "text-fg-secondary"}`}
                  />
                  <span>{t("auth.role.tutor")}</span>
                </div>
                <span className="text-[11px] font-body text-fg-secondary line-clamp-1">
                  {t("auth.role.tutor.desc")}
                </span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            <Input
              id="fullName"
              label={t("auth.fullName.label")}
              placeholder={t("auth.fullName.placeholder")}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: null }));
              }}
              error={errors.fullName}
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              required
              disabled={loading}
              className="space-y-1"
            />

            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              label={t("auth.phone.label")}
              placeholder={t("auth.phone.placeholder")}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
              }}
              error={errors.phone}
              helperText={t("auth.contact.hint")}
              autoComplete="tel-national"
              enterKeyHint="next"
              disabled={loading}
              className="space-y-1"
            />

            <Input
              id="email"
              type="email"
              label={t("auth.email.label")}
              placeholder={t("auth.email.placeholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
              }}
              error={errors.email}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
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
              autoComplete="new-password"
              enterKeyHint="go"
              required
              disabled={loading}
              className="space-y-1"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-display font-semibold text-sm tracking-wide shadow-sm hover:shadow-md hover:shadow-orange/20 transition-all"
              loading={loading}
            >
              {t("auth.submit.register")}
            </Button>
          </form>

          {/* Footer Divider & Login link */}
          <div className="mt-6 pt-5 border-t border-border/80 text-center">
            <p className="text-xs sm:text-sm font-body text-fg-secondary">
              <Link
                to="/login"
                className="font-display font-semibold text-orange-text hover:text-orange transition-colors inline-flex items-center gap-1"
              >
                <span>{t("auth.haveAccount")}</span>
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge at bottom */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-fg-muted font-display select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span>SylhetyTutor &middot; 100% NID &amp; University ID Verified</span>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="text-center text-[11px] text-fg-muted/70 font-display py-2">
        &copy; {CURRENT_YEAR} SylhetyTutor. All rights reserved.
      </footer>
    </div>
  );
}
