import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { createReport } from "../../api/safety";
import { getFormError } from "../../api/errors";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { useTranslation } from "../../i18n";

const CATEGORIES = [
  "inappropriate_behavior",
  "fake_profile",
  "harassment",
  "unresponsive",
  "payment_issue",
  "safety_concern",
  "other",
];

export function ReportDialog({ isOpen, onClose, targetUserId, targetSlug, targetName }) {
  const { t, i18n } = useTranslation();
  const [category, setCategory] = useState("inappropriate_behavior");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError(t("report.reasonPlaceholder"));
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await createReport({
        target_user_id: targetUserId || undefined,
        target_slug: targetSlug || undefined,
        category,
        reason: reason.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason("");
        onClose();
      }, 1500);
    } catch (err) {
      setError(getFormError(err, i18n) || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
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
          <div className="w-9 h-9 rounded-xl bg-error/15 text-error flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 id="report-dialog-title" className="text-xl font-display font-bold">
              {t("report.title")}
            </h2>
            {targetName && (
              <p className="text-xs text-fg-muted">Target: {targetName}</p>
            )}
          </div>
        </div>

        <p className="text-xs md:text-sm text-fg-secondary mb-5">
          {t("report.subtitle")}
        </p>

        {success ? (
          <Alert variant="success" className="my-4">
            {t("report.success")}
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <div>
              <label
                htmlFor="report-category"
                className="block text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-2"
              >
                {t("report.categoryLabel")}
              </label>
              <select
                id="report-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-fg focus:outline-none focus:ring-2 focus:ring-orange text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`report.category.${cat}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="report-reason"
                className="block text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-2"
              >
                {t("report.reasonLabel")}
              </label>
              <textarea
                id="report-reason"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("report.reasonPlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-orange text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting ? t("report.submitting") : t("report.submit")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
