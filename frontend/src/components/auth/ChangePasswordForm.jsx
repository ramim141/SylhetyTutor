import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useTranslation } from "../../i18n";
import { authApi } from "../../api/auth";
import { getFieldErrors, getFormError } from "../../api/errors";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { PasswordInput } from "../ui/PasswordInput";

const MIN_LENGTH = 8;
const FIELD_NAMES = { old_password: "oldPassword", new_password: "password" };

export function ChangePasswordForm() {
  const i18n = useTranslation();
  const { t } = i18n;
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  const close = () => {
    setOpen(false);
    setOldPassword("");
    setNewPassword("");
    setErrors({});
    setServerError("");
  };

  const validate = () => {
    const next = {};
    if (!oldPassword) next.oldPassword = t("error.oldPassword.required");
    if (!newPassword) next.password = t("error.password.required");
    else if (newPassword.length < MIN_LENGTH) next.password = t("error.password.password_too_short");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setChanged(false);
    if (!validate()) return;

    setLoading(true);
    try {
      await authApi.changePassword({ old_password: oldPassword, new_password: newPassword });
      close();
      setChanged(true);
    } catch (err) {
      setServerError(getFormError(err, i18n) || "");
      setErrors(getFieldErrors(err, i18n, FIELD_NAMES));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-bg-card border border-border rounded-lg p-5 shadow-card flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-display font-bold text-fg-secondary">{t("security.title")}</h2>
        {open && <p className="text-xs text-fg-muted mt-0.5">{t("security.passwordHint")}</p>}
      </div>

      {changed && <Alert variant="success">{t("security.passwordChanged")}</Alert>}

      {open ? (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="error" onClose={() => setServerError("")}>
              {serverError}
            </Alert>
          )}
          <PasswordInput
            label={t("security.currentPassword")}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            error={errors.oldPassword}
            autoComplete="current-password"
            required
          />
          <PasswordInput
            label={t("security.newPassword")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
            required
          />
          <div className="flex gap-3">
            <Button type="submit" loading={loading} className="flex-1">
              {t("security.update")}
            </Button>
            <Button type="button" variant="ghost" onClick={close} disabled={loading}>
              {t("security.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setChanged(false);
            setOpen(true);
          }}
          className="w-full"
        >
          <KeyRound className="w-5 h-5" aria-hidden />
          {t("security.changePassword")}
        </Button>
      )}
    </section>
  );
}

export default ChangePasswordForm;
