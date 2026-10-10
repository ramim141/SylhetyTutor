import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, ArrowLeft, UserCheck, BookOpen } from "lucide-react";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

export default function Register() {
  const { t, lang } = useTranslation();
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

  const validate = () => {
    const newErrors = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    const cleanPhone = phone.trim().replace(/[\s-]/g, "");
    if (!cleanPhone && !email.trim()) {
      newErrors.phone = t("error.phone.invalid");
    } else if (cleanPhone) {
      // Basic BD mobile check: either 11 digits starting 01[3-9] or with +880
      const bdPhoneRegex = /^(?:\+?880|0)?1[3-9]\d{8}$/;
      if (!bdPhoneRegex.test(cleanPhone)) {
        newErrors.phone = t("error.phone.invalid");
      }
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    if (!password || password.length < 8) {
      newErrors.password = t("error.password.weak");
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
      const resp = err.response?.data;
      const status = err.response?.status;

      if (!err.response) {
        setServerError(t("error.network"));
      } else if (status === 429 || resp?.code === "throttled") {
        setServerError(t("error.throttled"));
      } else if (resp?.fields) {
        const fieldErrors = {};
        for (const [key, val] of Object.entries(resp.fields)) {
          const errItem = Array.isArray(val) ? val[0] : val;
          const code = typeof errItem === "object" ? errItem.code : errItem;
          const stateKey = key === "full_name" ? "fullName" : key;

          if (key === "phone" && code === "unique") {
            fieldErrors.phone = t("error.phone.unique");
          } else if (key === "email" && code === "unique") {
            fieldErrors.email = t("error.email.unique");
          } else if (key === "password") {
            fieldErrors.password = t("error.password.weak");
          } else {
            fieldErrors[stateKey] =
              (typeof errItem === "object" ? errItem.message : errItem) || t("error.generic");
          }
        }
        setErrors(fieldErrors);
      } else {
        setServerError(resp?.detail || t("error.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-display font-medium text-fg-secondary hover:text-fg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("nav.home")}</span>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange flex items-center justify-center text-on-orange shadow-md shadow-orange/20">
            <GraduationCap className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="font-display font-black text-2xl tracking-tight text-fg">
            Sylhety<span className="text-orange">Tutor</span>
          </span>
        </div>

        <h1 className="mt-3 text-center text-2xl font-display font-extrabold text-fg tracking-tight">
          {t("auth.register.title")}
        </h1>
        <p className="mt-1 text-center text-sm font-body text-fg-secondary">
          {t("auth.register.subtitle")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-bg-card py-8 px-6 shadow-xl border border-border rounded-2xl sm:px-10">
          {serverError && (
            <Alert variant="error" className="mb-6" onClose={() => setServerError("")}>
              {serverError}
            </Alert>
          )}

          {/* Role selection switcher */}
          <div className="mb-6">
            <label className="block text-xs font-display font-bold text-fg mb-2">
              {t("auth.role.label")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("guardian")}
                className={`p-3.5 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  role === "guardian"
                    ? "border-orange bg-orange/5 ring-2 ring-orange/20"
                    : "border-border hover:border-fg-muted/40 bg-bg-subtle"
                }`}
              >
                <div className="flex items-center gap-1.5 font-display font-bold text-sm text-fg">
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
                className={`p-3.5 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  role === "tutor"
                    ? "border-orange bg-orange/5 ring-2 ring-orange/20"
                    : "border-border hover:border-fg-muted/40 bg-bg-subtle"
                }`}
              >
                <div className="flex items-center gap-1.5 font-display font-bold text-sm text-fg">
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

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              required
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              required
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-display font-bold text-base shadow-lg shadow-orange/20"
              loading={loading}
            >
              {t("auth.submit.register")}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm font-body text-fg-secondary">
              <Link
                to="/login"
                className="font-display font-semibold text-orange-text hover:underline"
              >
                {t("auth.haveAccount")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
