import { useState } from "react";
import { useTranslation } from "../../i18n";
import { applyToRequirement } from "../../api/applications";
import { getFieldErrors, getFormError } from "../../api/errors";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

const MAX = 300;

/** Short optional note, then send. `onApplied(application)` runs after the API accepts it. */
export function ApplyDialog({ requirementId, onClose, onApplied }) {
  const { t, has } = useTranslation();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    setFieldError(null);
    try {
      const application = await applyToRequirement(requirementId, message.trim());
      onApplied(application);
    } catch (err) {
      const fields = getFieldErrors(err, { t, has });
      setFieldError(fields.message || null);
      setError(fields.message ? null : getFormError(err, { t, has }) || t("error.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      isOpen
      busy={busy}
      onClose={onClose}
      title={t("app.dialog.title")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("app.dialog.cancel")}
          </Button>
          <Button onClick={send} loading={busy}>
            {busy ? t("app.dialog.sending") : t("app.dialog.send")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-secondary">{t("app.dialog.body")}</p>
      {error && <Alert variant="error">{error}</Alert>}
      <div>
        <label htmlFor="apply-message" className="block text-xs font-display font-bold mb-1">
          {t("app.dialog.label")}
        </label>
        <textarea
          id="apply-message"
          value={message}
          maxLength={MAX}
          rows={4}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("app.dialog.placeholder")}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "apply-message-error" : undefined}
          className={`w-full px-3.5 py-2.5 rounded-xl text-base font-body bg-bg-card border focus:outline-hidden text-fg placeholder:text-fg-muted/50 ${
            fieldError
              ? "border-error focus:ring-3 focus:ring-error/15"
              : "border-border focus:border-orange focus:ring-3 focus:ring-orange/15"
          }`}
        />
        <div className="flex justify-between gap-2">
          {fieldError ? (
            <p id="apply-message-error" role="alert" className="text-sm text-error">
              {fieldError}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-fg-muted tabular-nums">
            {message.length}/{MAX}
          </span>
        </div>
      </div>
    </Dialog>
  );
}
