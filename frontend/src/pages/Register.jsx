import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  GraduationCap,
  Lock,
  MapPin,
  ShieldCheck,
  User,
  Users,
  Sun,
  Moon,
  Laptop,
  Globe,
} from "lucide-react";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { getLookups } from "../api/lookups";
import { getFieldErrors, getFormError } from "../api/errors";
import { toLocalBdPhone } from "../utils/phone";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Logo } from "../components/ui/Logo";

const ROLES = [
  { value: "guardian", icon: Users },
  { value: "tutor", icon: GraduationCap },
];

const FIELD = "min-h-13 xl:min-h-11 rounded-xl";

function FieldLabel({ htmlFor, required = false, children }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm xl:text-[13px] xl:leading-4 font-display font-semibold text-fg mb-1.5 xl:mb-1">
      {children}
      {required && (
        <span className="text-error ml-1" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-display font-medium text-error">
      {children}
    </p>
  );
}

const FEATURES = [
  { key: "verified", icon: ShieldCheck },
  { key: "expert", icon: GraduationCap },
  { key: "local", icon: MapPin },
];

/**
 * Brand panel (xl screens and up): a text-free photo with the poster's copy laid over it as
 * live text, so it switches between EN / বাং / Mixed. Always dark (ink tokens, DESIGN.md 2.4.1).
 * Fades at the top and bottom keep the copy readable on the photo.
 *
 * The card is always 576px wide at xl, so the photo renders 576x864 and `top: 45% - 327px`
 * puts the students' heads at 45% of the panel height for any window height. Short windows
 * hide the paragraph and tagline so nothing covers their faces.
 */
function BrandPanel({ t }) {
  return (
    <aside className="hidden xl:flex relative min-h-0 flex-col justify-between bg-ink text-on-ink overflow-clip">
      <img
        src="/images/auth-photo.jpg"
        alt=""
        aria-hidden
        className="absolute inset-x-0 top-[calc(45%-327px)] w-full h-auto select-none"
        draggable={false}
      />
      <div className="absolute inset-x-0 top-0 h-[52%] bg-linear-to-b from-ink via-ink/85 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-linear-to-t from-ink via-ink/90 to-transparent" aria-hidden />

      {/* Copy */}
      <div className="relative flex flex-col items-start gap-4 px-10 pt-9">
        <Logo variant="on-dark" className="h-11" />

        <span className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-on-ink/20 bg-on-ink/10 backdrop-blur-sm text-sm font-display font-semibold text-on-ink">
          <Users className="w-4 h-4 text-orange" aria-hidden />
          {t("reg.panel.pill")}
        </span>

        <h2 className="text-[2rem] leading-[1.2] font-display font-extrabold text-on-ink text-balance">
          {t("reg.panel.title1")}
          <br />
          {t("reg.panel.titleRest")} <span className="text-orange">{t("reg.panel.titleAccent")}</span>
        </h2>

        <p className="text-[15px] leading-relaxed text-on-ink/90 max-w-md [@media(max-height:760px)]:hidden">{t("reg.panel.body")}</p>
      </div>

      {/* Handwritten tagline, tilted over the wall behind the students */}
      <p
        className="absolute right-8 top-[38%] w-36 -rotate-[8deg] [@media(max-height:840px)]:hidden font-script text-[1.7rem] leading-[1.05] text-on-ink select-none"
        aria-hidden
      >
        {t("reg.panel.tagline")}
        <svg viewBox="0 0 150 12" className="mt-1 w-32 text-orange" fill="none" aria-hidden>
          <path d="M2 9C40 2 100 2 148 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </p>

      {/* Three promises */}
      <ul className="relative grid grid-cols-3 divide-x divide-on-ink/15 px-10 pb-8">
        {FEATURES.map(({ key, icon: Icon }) => (
          <li key={key} className="flex flex-col items-center gap-3 px-2 text-center">
            <span className="w-14 h-14 rounded-full bg-ink-soft border border-ink-border flex items-center justify-center">
              <Icon className="w-7 h-7 text-orange" aria-hidden />
            </span>
            <span className="max-w-[7.5rem] text-sm leading-snug font-display font-semibold text-on-ink">
              {t(`reg.feature.${key}`)}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default function Register() {
  const i18n = useTranslation();
  const { t, lang, setLang } = i18n;
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);

  const cycleTheme = () => {
    const next = { light: "dark", dark: "system", system: "light" };
    setTheme(next[theme] || "light");
  };

  const cycleLang = () => {
    const next = { mixed: "bn", bn: "en", en: "mixed" };
    setLang(next[lang] || "mixed");
  };

  const [role, setRole] = useState("guardian");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [areas, setAreas] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getLookups()
      .then((data) => active && setAreas(data?.areas || []))
      .catch(() => {}); // select stays empty; submit then reports the area error
    return () => {
      active = false;
    };
  }, []);

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const next = {};
    if (fullName.trim().length < 2) next.fullName = t("error.fullName.short");
    if (!phone.trim()) next.phone = t("error.phone.missing");
    else if (!toLocalBdPhone(phone)) next.phone = t("error.phone.invalid");
    if (!area) next.area = t("error.area.required");
    if (password.length < 8) next.password = t("error.password.password_too_short");
    if (!agreed) next.terms = t("error.terms.required");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        phone: toLocalBdPhone(phone),
        area,
        password,
        role,
        preferred_language: lang,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(getFormError(err, i18n) || "");
      setErrors(getFieldErrors(err, i18n, { full_name: "fullName" }));
    } finally {
      setLoading(false);
    }
  };

  const areaName = (a) => (lang === "en" ? a.name_en : a.name_bn);

  // Go back to wherever the visitor came from; if this page was opened directly, go home
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/"));

  return (
    <div className="min-h-dvh bg-bg-subtle xl:h-dvh xl:overflow-hidden xl:flex xl:items-center xl:justify-center xl:p-6">
      <div className="w-full xl:max-w-6xl xl:h-full xl:max-h-[58rem] xl:grid xl:grid-cols-2 xl:grid-rows-1 bg-bg-subtle xl:bg-bg-card xl:rounded-2xl xl:border xl:border-border xl:shadow-lg overflow-clip">
        <main className="w-full max-w-lg mx-auto px-4 sm:px-8 xl:px-12 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] relative xl:min-h-0 xl:overflow-y-auto xl:justify-center-safe xl:py-4 flex flex-col gap-6 xl:gap-3.5">
          {/* Top Bar: Back to Home + Quick Preferences */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              aria-label={t("common.back")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-medium text-fg-secondary hover:text-fg bg-bg-card hover:bg-bg-subtle border border-border/80 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t("nav.home")}</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Language Toggle Chip */}
              <button
                type="button"
                onClick={cycleLang}
                aria-label="Toggle language"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display font-semibold text-fg-secondary hover:text-fg bg-bg-card border border-border/80 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Globe className="w-3.5 h-3.5 text-orange" />
                <span>{lang === "en" ? "EN" : lang === "bn" ? "বাং" : "Mix"}</span>
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={cycleTheme}
                aria-label="Toggle theme"
                className="p-1.5 rounded-full text-fg-secondary hover:text-fg bg-bg-card border border-border/80 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                {theme === "light" && <Sun className="w-3.5 h-3.5 text-orange" />}
                {theme === "dark" && <Moon className="w-3.5 h-3.5 text-info" />}
                {theme === "system" && <Laptop className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Phones: title + form sit in a bordered, shadowed card so it reads as a form.
              xl: contents drops the box, the desktop layout is unchanged. */}
          <div className="flex flex-col gap-6 bg-bg-card border border-border rounded-2xl shadow-lg p-5 sm:p-6 xl:contents">
            <header className="flex flex-col gap-1.5 xl:gap-2">
              <h1 className="text-[1.75rem] leading-tight xl:text-2xl font-display font-extrabold tracking-tight">{t("reg.title")}</h1>
              <p className="text-[15px] text-fg-secondary xl:text-sm [@media(max-height:800px)]:xl:hidden">{t("reg.subtitle")}</p>
            </header>

            {serverError && (
              <Alert variant="error" onClose={() => setServerError("")}>
                {serverError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 xl:gap-3">
              {/* Role */}
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-display font-semibold mb-2">{t("reg.roleQuestion")}</legend>
                <div
                  role="radiogroup"
                  aria-label={t("reg.roleQuestion")}
                  className="grid grid-cols-2 gap-3 xl:gap-1.5 xl:p-1.5 xl:rounded-xl xl:bg-bg-subtle xl:border xl:border-border"
                >
                  {ROLES.map(({ value, icon: Icon }) => {
                    const selected = role === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setRole(value)}
                        className={`relative min-h-[5.75rem] xl:min-h-12 flex flex-col xl:flex-row items-center justify-center gap-1.5 xl:gap-2.5 px-3 xl:px-2.5 py-3 xl:py-2 rounded-xl border text-center xl:text-left transition cursor-pointer ${
                          selected
                            ? "border-orange bg-orange-pale xl:bg-bg-card xl:shadow-sm"
                            : "border-border bg-bg-card hover:bg-bg-subtle xl:border-transparent xl:bg-transparent xl:hover:bg-bg-card/60"
                        }`}
                      >
                        {selected && (
                          <span className="xl:hidden absolute top-2 right-2 w-5 h-5 rounded-full bg-orange text-on-orange flex items-center justify-center">
                            <Check className="w-3 h-3" strokeWidth={3} aria-hidden />
                          </span>
                        )}
                        <Icon className={`w-6 h-6 shrink-0 ${selected ? "text-orange" : "text-fg-muted"}`} aria-hidden />
                        <span className="flex flex-col min-w-0">
                          <span className="hidden xl:block text-[11px] font-display font-semibold uppercase tracking-wider text-fg-muted">
                            {t(`reg.role.${value}.kicker`)}
                          </span>
                          <span className={`font-display font-bold leading-tight text-sm xl:text-[15px] xl:whitespace-nowrap ${selected ? "text-fg" : "text-fg-secondary"}`}>
                            {t(`reg.role.${value}`)}
                          </span>
                          <span className="xl:hidden mt-0.5 text-xs text-fg-muted">
                            {t(`auth.role.${value}.desc`)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <FieldLabel htmlFor="fullName" required>
                  {t("reg.fullName.label")}
                </FieldLabel>
                <Input
                id="fullName"
                placeholder={t("reg.fullName.placeholder")}
                leftIcon={User}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearError("fullName");
                }}
                error={errors.fullName}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                required
                disabled={loading}
                inputClassName={FIELD}
                />
              </div>

              {/* Phone with fixed +880 prefix */}
              <div>
                <FieldLabel htmlFor="phone" required>
                  {t("reg.phone.label")}
                </FieldLabel>
                <div
                  className={`flex items-stretch ${FIELD} border bg-bg-card overflow-clip transition focus-within:ring-3 ${
                    errors.phone
                      ? "border-error focus-within:ring-error/15"
                      : "border-border focus-within:border-orange focus-within:ring-orange/15"
                  }`}
                >
                  <span
                    className="flex items-center px-3.5 bg-bg-subtle border-r border-border font-display font-semibold text-fg tabular-nums"
                    aria-label={t("reg.phone.countryCode")}
                  >
                    +880
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    enterKeyHint="next"
                    maxLength={16}
                    placeholder={t("reg.phone.placeholder")}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearError("phone");
                    }}
                    required
                    disabled={loading}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    className="flex-1 min-w-0 px-3.5 bg-transparent text-base text-fg tabular-nums placeholder:text-fg-muted focus:outline-hidden"
                  />
                </div>
                <FieldError id="phone-error">{errors.phone}</FieldError>
              </div>

              {/* Area (native select: best picker on phones) */}
              <div>
                <FieldLabel htmlFor="area" required>
                  {t("reg.area.label")}
                </FieldLabel>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted pointer-events-none" aria-hidden />
                  <select
                    id="area"
                    value={area}
                    onChange={(e) => {
                      setArea(e.target.value);
                      clearError("area");
                    }}
                    required
                    disabled={loading}
                    aria-invalid={Boolean(errors.area)}
                    aria-describedby={errors.area ? "area-error" : undefined}
                    className={`w-full ${FIELD} appearance-none pl-10 pr-10 border bg-bg-card text-base cursor-pointer transition focus:outline-hidden focus:ring-3 ${
                      area ? "text-fg" : "text-fg-muted"
                    } ${
                      errors.area
                        ? "border-error focus:ring-error/15"
                        : "border-border focus:border-orange focus:ring-orange/15"
                    }`}
                  >
                    <option value="" disabled>
                      {t("reg.area.placeholder")}
                    </option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.slug} className="text-fg">
                        {areaName(a)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-muted pointer-events-none" aria-hidden />
                </div>
                <FieldError id="area-error">{errors.area}</FieldError>
              </div>

              <div>
                <FieldLabel htmlFor="password" required>
                  {t("reg.password.label")}
                </FieldLabel>
                <PasswordInput
                id="password"
                placeholder={t("reg.password.placeholder")}
                leftIcon={Lock}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                error={errors.password}
                autoComplete="new-password"
                enterKeyHint="go"
                required
                disabled={loading}
                inputClassName={FIELD}
                />
              </div>

              {/* Terms */}
              <div>
                <label className="flex items-start gap-3 text-sm text-fg-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => {
                      setAgreed(e.target.checked);
                      clearError("terms");
                    }}
                    aria-invalid={Boolean(errors.terms)}
                    aria-describedby={errors.terms ? "terms-error" : undefined}
                    className="mt-0.5 w-5 h-5 shrink-0 rounded accent-orange cursor-pointer"
                  />
                  <span>
                    {t("reg.terms.before")}{" "}
                    <Link to="/terms" className="font-semibold text-orange-text underline underline-offset-2">
                      {t("reg.terms.terms")}
                    </Link>{" "}
                    {t("reg.terms.and")}{" "}
                    <Link to="/privacy" className="font-semibold text-orange-text underline underline-offset-2">
                      {t("reg.terms.privacy")}
                    </Link>{" "}
                    {t("reg.terms.after")}
                  </span>
                </label>
                <FieldError id="terms-error">{errors.terms}</FieldError>
              </div>

              <Button type="submit" size="lg" loading={loading} className="w-full xl:min-h-12 rounded-xl shadow-md shadow-orange/25">
                {t("reg.submit")}
                <ArrowRight className="w-5 h-5" aria-hidden />
              </Button>
            </form>

            {/* Google sign-in isn't built yet: shown disabled on large screens (reference design), hidden on phones */}
            <div className="hidden xl:contents">
            <div className="flex items-center gap-3 text-sm text-fg-muted" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              {t("reg.or")}
              <span className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              disabled
              className="min-h-13 xl:min-h-12 w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 rounded-xl border border-border bg-bg-card font-display font-semibold text-fg opacity-70 cursor-not-allowed"
            >
              <img src="/icons/google.svg" alt="" className="w-5 h-5" />
              {t("reg.google")}
              <span className="px-2 py-0.5 rounded-full bg-bg-subtle text-[11px] text-fg-secondary">
                {t("reg.comingSoon")}
              </span>
            </button>

            </div>

            <p className="text-center text-sm text-fg-secondary pt-5 xl:pt-3 border-t border-border">
              {t("reg.haveAccount")}{" "}
              <Link to="/login" className="inline-flex items-center min-h-11 xl:min-h-9 font-display font-bold text-orange-text hover:underline">
                {t("reg.signIn")}
              </Link>
            </p>
          </div>
        </main>

        <BrandPanel t={t} />
      </div>
    </div>
  );
}
