import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
import { useTranslation } from "../../i18n";
import { labelOf } from "../../utils/lookups";
import { getFormError } from "../../api/errors";
import {
  closeRequirement,
  deleteRequirement,
  getMyRequirements,
  publishRequirement,
} from "../../api/requirements";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { BottomNav } from "../../components/layout/BottomNav";
import { budgetText, headline } from "../../components/requirements/requirementText";

const CLOSE_REASONS = ["found_tutor", "no_longer_needed", "other"];

function statusOf(item) {
  return item.status === "open" && item.expired ? "expired" : item.status;
}

function RequirementCard({ item, busy, onPublish, onClose, onDelete }) {
  const ctx = useTranslation();
  const { t, lang } = ctx;
  const status = statusOf(item);
  const until = item.expires_at
    ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "bn-BD", { dateStyle: "medium" }).format(
        new Date(item.expires_at),
      )
    : null;

  return (
    <li className="bg-bg-card border border-border rounded-lg p-4 shadow-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display font-bold text-fg min-w-0 break-words">
          {headline(item, lang, t("req.untitled"))}
        </h2>
        <Badge variant={status === "open" ? "featured" : "tag"} className="shrink-0">
          {t(`req.status.${status}`)}
        </Badge>
      </div>
      <p className="text-sm text-fg-secondary">
        {[labelOf(item.area, lang), budgetText(item, ctx), t(`req.gender.${item.preferred_gender}`)]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {item.schedule_note && (
        <p className="text-sm text-fg-secondary break-words">{item.schedule_note}</p>
      )}
      {status === "open" && until && (
        <p className="text-xs text-fg-muted">{t("req.openUntil", { date: until })}</p>
      )}
      {status === "expired" && <p className="text-xs text-fg-muted">{t("req.expiredNote")}</p>}
      {status === "draft" && item.missing.length > 0 && (
        <p className="text-xs text-fg-muted">{t("req.incomplete")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <>
            <Button size="sm" disabled={busy} onClick={() => onPublish(item)}>
              {t("req.action.publish")}
            </Button>
            <Link to={`/requirements/${item.id}/edit`}>
              <Button size="sm" variant="outline">
                {t("req.action.edit")}
              </Button>
            </Link>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDelete(item)}>
              {t("req.action.delete")}
            </Button>
          </>
        )}
        {status === "open" && (
          <>
            <Link to={`/requirements/${item.id}/applicants`}>
              <Button size="sm">{t("req.action.applicants", { count: item.application_count })}</Button>
            </Link>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onClose(item)}>
              {t("req.action.close")}
            </Button>
          </>
        )}
        {(status === "closed" || status === "expired") && (
          <Button size="sm" disabled={busy} onClick={() => onPublish(item)}>
            {t("req.action.republish")}
          </Button>
        )}
      </div>
    </li>
  );
}

export default function MyRequirements() {
  const { t, has } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ status: "loading", items: [] });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { variant, text }
  const [closing, setClosing] = useState(null);
  const [closeReason, setCloseReason] = useState("found_tutor");
  const [deleting, setDeleting] = useState(null);

  const notice = location.state?.notice;

  useEffect(() => {
    let cancelled = false;
    getMyRequirements()
      .then((items) => !cancelled && setState({ status: "ready", items }))
      .catch(() => !cancelled && setState({ status: "error", items: [] }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const run = async (action, success) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (success) setMessage({ variant: "success", text: success });
      reload();
    } catch (err) {
      setMessage({ variant: "error", text: getFormError(err, { t, has }) || t("error.generic") });
    } finally {
      setBusy(false);
    }
  };

  const publish = (item) => run(() => publishRequirement(item.id), t("req.form.published"));

  const confirmClose = async () => {
    const item = closing;
    setClosing(null);
    await run(() => closeRequirement(item.id, closeReason));
  };

  const confirmDelete = async () => {
    const item = deleting;
    setDeleting(null);
    await run(() => deleteRequirement(item.id));
  };

  return (
    <div className="min-h-dvh bg-bg-subtle text-fg pb-28 md:pb-10">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-2 h-14 flex items-center gap-1">
          <Link
            to="/dashboard"
            className="w-11 h-11 flex items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-bg-subtle"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </Link>
          <h1 className="text-lg font-display font-bold flex-1">{t("req.title")}</h1>
          <Button size="sm" onClick={() => navigate("/requirements/new")}>
            <Plus className="w-4 h-4 mr-1" aria-hidden />
            {t("req.new")}
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-3">
        {notice && !message && (
          <Alert variant="success">
            {notice === "published" ? t("req.form.published") : t("req.form.saved")}
          </Alert>
        )}
        {message && <Alert variant={message.variant}>{message.text}</Alert>}

        {state.status === "loading" && (
          <p role="status" className="text-sm text-fg-secondary text-center py-10">
            {t("common.loading")}
          </p>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="bg-bg-card border border-border rounded-lg p-5 flex flex-col gap-3"
          >
            <p className="text-sm text-error">{t("req.loadFailed")}</p>
            <Button variant="outline" onClick={reload} className="w-full">
              {t("common.retry")}
            </Button>
          </div>
        )}
        {state.status === "ready" && state.items.length === 0 && (
          <div className="bg-bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3 text-center">
            <ClipboardList className="w-8 h-8 text-fg-muted" aria-hidden />
            <p className="text-sm text-fg-secondary">{t("req.empty")}</p>
            <Button onClick={() => navigate("/requirements/new")}>{t("req.new")}</Button>
          </div>
        )}
        {state.status === "ready" && state.items.length > 0 && (
          <ul className="flex flex-col gap-3">
            {state.items.map((item) => (
              <RequirementCard
                key={item.id}
                item={item}
                busy={busy}
                onPublish={publish}
                onClose={(it) => {
                  setCloseReason("found_tutor");
                  setClosing(it);
                }}
                onDelete={setDeleting}
              />
            ))}
          </ul>
        )}
      </main>

      <Dialog
        isOpen={Boolean(closing)}
        onClose={() => setClosing(null)}
        title={t("req.close.title")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setClosing(null)}>
              {t("req.close.cancel")}
            </Button>
            <Button onClick={confirmClose}>{t("req.close.confirm")}</Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">{t("req.close.body")}</p>
        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">{t("req.close.title")}</legend>
          {CLOSE_REASONS.map((reason) => (
            <label
              key={reason}
              className="flex items-center gap-3 min-h-11 text-sm text-fg cursor-pointer"
            >
              <input
                type="radio"
                name="close-reason"
                value={reason}
                checked={closeReason === reason}
                onChange={() => setCloseReason(reason)}
                className="w-5 h-5 accent-orange"
              />
              {t(`req.close.${reason}`)}
            </label>
          ))}
        </fieldset>
      </Dialog>

      <Dialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t("req.delete.title")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t("req.delete.cancel")}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t("req.delete.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">{t("req.delete.body")}</p>
      </Dialog>

      <BottomNav />
    </div>
  );
}
