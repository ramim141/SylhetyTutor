import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { getFieldErrors, getFormError } from "../api/errors";

export default function Login() {
  const i18n = useTranslation();
  const { t } = i18n;
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

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
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getFormError(err, i18n) || "");
      setErrors(getFieldErrors(err, i18n));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg flex flex-col justify-center py-8 sm:py-12 sm:px-6 lg:px-8 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] transition-colors">
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
          {t("auth.login.title")}
        </h1>
        <p className="mt-1 text-center text-sm font-body text-fg-secondary">
          {t("auth.login.subtitle")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-bg-card py-8 px-6 shadow-xl border border-border rounded-2xl sm:px-10">
          {serverError && (
            <Alert variant="error" className="mb-6" onClose={() => setServerError("")}>
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              required
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
              autoComplete="current-password"
              enterKeyHint="go"
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
              {t("auth.submit.login")}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm font-body text-fg-secondary">
              <Link
                to="/register"
                className="font-display font-semibold text-orange-text hover:underline"
              >
                {t("auth.noAccount")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
