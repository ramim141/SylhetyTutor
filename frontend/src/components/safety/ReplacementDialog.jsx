import { useState } from "react";
import { HeartHandshake, X } from "lucide-react";
import { createReplacementRequest } from "../../api/safety";
import { getFormError } from "../../api/errors";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { useTranslation } from "../../i18n";

export function ReplacementDialog({ isOpen, onClose, matchId, onSuccess }) {
  const { t, i18n } = useTranslation();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(t("replacement.reasonPlaceholder"));
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await createReplacementRequest({
        match_id: matchId,
        reason: reason.trim(),
      });
      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        setReason("");
        onClose();
      }, 1500);
    } catch (err) {
      setError(getFormError(err, i18n) || t("error.already_requested"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="replacement-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-fg">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-orange-light text-orange-text flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h2 id="replacement-dialog-title" className="text-xl font-display font-bold">
              {t("replacement.title")}
            </h2>
            <span className="text-xs font-semibold text-orange uppercase tracking-wider">
              {t("safety.guaranteeBadge")}
            </span>
          </div>
        </div>

        <p className="text-xs md:text-sm text-fg-secondary mb-5">
          {t("replacement.subtitle")}
        </p>

        {success ? (
          <Alert variant="success" className="my-4">
            {t("replacement.success")}
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <div>
              <label
                htmlFor="replacement-reason"
                className="block text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-2"
              >
                {t("replacement.reasonLabel")}
              </label>
              <textarea
                id="replacement-reason"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("replacement.reasonPlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-orange text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("replacement.submitting") : t("replacement.submit")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
