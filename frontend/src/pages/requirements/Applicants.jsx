import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Users } from "lucide-react";
import { useTranslation } from "../../i18n";
import { labelOf } from "../../utils/lookups";
import { formatDateTime } from "../../utils/dateTime";
import { getFieldErrors, getFormError } from "../../api/errors";
import {
  bookDemo,
  getApplicants,
  rejectApplication,
  shortlistApplication,
} from "../../api/applications";
import { getRequirement } from "../../api/requirements";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { BottomNav } from "../../components/layout/BottomNav";
import { ContactCard } from "../../components/applications/ContactCard";
import { headline } from "../../components/requirements/requirementText";

const STATUS_VARIANT = { applied: "tag", viewed: "tag", shortlisted: "featured", rejected: "tag" };

/** Value for <input type="datetime-local">: local time, minutes precision. */
function localInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function ApplicantCard({ item, busy, onShortlist, onReject, onBook }) {
  const { t, lang } = useTranslation();
  const tutor = item.tutor;
  const place = [
    tutor.university
      ? `${labelOf(tutor.university, lang)}${tutor.department ? ` (${tutor.department})` : ""}`
      : tutor.department,
    tutor.area && labelOf(tutor.area, lang),
  ].filter(Boolean);
  const fee =
    tutor.feeMin != null && tutor.feeMax != null
      ? t("app.applicants.fee", {
          min: new Intl.NumberFormat(lang === "en" ? "en-IN" : "bn-BD").format(tutor.feeMin),
          max: new Intl.NumberFormat(lang === "en" ? "en-IN" : "bn-BD").format(tutor.feeMax),
        })
      : t("app.applicants.noFee");

  return (
    <li className="bg-bg-card border border-border rounded-lg p-4 shadow-card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {tutor.avatarUrl ? (
          <img
            src={tutor.avatarUrl}
            alt=""
            className="w-13 h-13 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-13 h-13 rounded-full bg-bg-subtle border border-border flex items-center justify-center font-display font-bold text-navy text-lg select-none shrink-0">
            {tutor.initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display font-bold text-fg flex items-center gap-1.5 min-w-0">
              <span className="truncate">{tutor.name}</span>
              {tutor.isVerified && (
                <CheckCircle className="w-4 h-4 text-info shrink-0" aria-label={t("card.verifiedTitle")} />
              )}
            </h2>
            <Badge variant={STATUS_VARIANT[item.status]} className="shrink-0">
              {t(`app.status.${item.status === "viewed" ? "applied" : item.status}`)}
            </Badge>
          </div>
          {tutor.subjects.length > 0 && (
            <p className="text-sm font-display font-semibold text-orange-text break-words">
              {tutor.subjects.map((s) => labelOf(s, lang)).join(", ")}
            </p>
          )}
          {place.length > 0 && (
            <p className="text-xs text-fg-muted break-words">{place.join(" · ")}</p>
          )}
          <p className="text-sm text-fg-secondary tabular-nums">{fee}</p>
        </div>
      </div>

      {item.message && (
        <div className="bg-bg-subtle rounded-md p-3">
          <p className="text-xs text-fg-muted">{t("app.applicants.note")}</p>
          <p className="text-sm text-fg break-words">{item.message}</p>
        </div>
      )}

      {item.demo_at && (
        <p className="text-sm font-display font-semibold text-fg">
          {t("app.demo.at", { when: formatDateTime(item.demo_at, lang) })}
        </p>
      )}
      {item.contact && <ContactCard contact={item.contact} title={t("app.contact.tutor")} />}
      {item.demo_at && !item.contact && item.unlock_fee != null && (
        <p className="text-sm text-fg-secondary">{t("app.unlock.pending", { fee: item.unlock_fee })}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {(item.status === "applied" || item.status === "viewed") && (
          <>
            <Button size="sm" disabled={busy} onClick={() => onShortlist(item)}>
              {t("app.action.shortlist")}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onReject(item)}>
              {t("app.action.reject")}
            </Button>
          </>
        )}
        {item.status === "shortlisted" && (
          <>
            <Button
              size="sm"
              variant={item.demo_at ? "outline" : "primary"}
              disabled={busy}
              onClick={() => onBook(item)}
            >
              {item.demo_at ? t("app.action.moveDemo") : t("app.action.bookDemo")}
            </Button>
            {!item.demo_at && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onReject(item)}>
                {t("app.action.reject")}
              </Button>
            )}
          </>
        )}
        {item.status === "rejected" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onShortlist(item)}>
            {t("app.action.shortlist")}
          </Button>
        )}
        {tutor.slug && (
          <Link
            to={`/tutors/${tutor.slug}`}
            className="inline-flex items-center min-h-11 px-2 text-sm font-display font-semibold text-orange-text hover:underline"
          >
            {t("app.applicants.profile")}
          </Link>
        )}
      </div>
    </li>
  );
}

/** The guardian's list of applicants for one requirement: shortlist, reject, book a demo. */
export default function Applicants() {
  const { id } = useParams();
  const { t, has, lang } = useTranslation();
  const [state, setState] = useState({ status: "loading", items: [], requirement: null });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [booking, setBooking] = useState(null);
  const [when, setWhen] = useState("");
  const [earliest, setEarliest] = useState("");
  const [bookError, setBookError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getRequirement(id), getApplicants(id)])
      .then(([requirement, items]) => !cancelled && setState({ status: "ready", items, requirement }))
      .catch(() => !cancelled && setState({ status: "error", items: [], requirement: null }));
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const replace = (updated) =>
    setState((s) => ({ ...s, items: s.items.map((it) => (it.id === updated.id ? updated : it)) }));

  const decide = async (action, item, success) => {
    setBusy(true);
    setMessage(null);
    try {
      replace(await action(item.id));
      setMessage({ variant: "success", text: success });
    } catch (err) {
      setMessage({ variant: "error", text: getFormError(err, { t, has }) || t("error.generic") });
      reload();
    } finally {
      setBusy(false);
    }
  };

  const openBooking = (item) => {
    const soonest = new Date(Date.now() + 2 * 60 * 60 * 1000);
    setWhen(localInputValue(soonest));
    setEarliest(localInputValue(new Date()));
    setBookError(null);
    setBooking(item);
  };

  const confirmBooking = async () => {
    if (!when) {
      setBookError(t("error.demo_at.required"));
      return;
    }
    setBusy(true);
    setBookError(null);
    try {
      replace(await bookDemo(booking.id, new Date(when).toISOString()));
      setBooking(null);
      setMessage({ variant: "success", text: t("app.book.done") });
    } catch (err) {
      const fields = getFieldErrors(err, { t, has });
      setBookError(fields.demo_at || getFormError(err, { t, has }) || t("error.generic"));
    } finally {
      setBusy(false);
    }
  };

  const title = state.requirement
    ? headline(state.requirement, lang, t("req.untitled"))
    : t("app.applicants.title");

  return (
    <div className="min-h-dvh bg-bg-subtle text-fg pb-28 md:pb-10">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-2 h-14 flex items-center gap-1">
          <Link
            to="/requirements"
            className="w-11 h-11 flex items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-bg-subtle"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-display font-bold leading-tight">{t("app.applicants.title")}</h1>
            {state.requirement && <p className="text-xs text-fg-muted truncate">{title}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-3">
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
            <p className="text-sm text-error">{t("app.applicants.loadFailed")}</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setState({ status: "loading", items: [], requirement: null });
                reload();
              }}
            >
              {t("common.retry")}
            </Button>
          </div>
        )}
        {state.status === "ready" && state.items.length === 0 && (
          <div className="bg-bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3 text-center">
            <Users className="w-8 h-8 text-fg-muted" aria-hidden />
            <p className="text-sm text-fg-secondary">{t("app.applicants.empty")}</p>
          </div>
        )}
        {state.status === "ready" && state.items.length > 0 && (
          <>
            <p className="text-sm text-fg-secondary">{t("app.applicants.intro")}</p>
            <ul className="flex flex-col gap-3">
              {state.items.map((item) => (
                <ApplicantCard
                  key={item.id}
                  item={item}
                  busy={busy}
                  onShortlist={(it) => decide(shortlistApplication, it, t("app.decision.shortlisted"))}
                  onReject={(it) => decide(rejectApplication, it, t("app.decision.rejected"))}
                  onBook={openBooking}
                />
              ))}
            </ul>
          </>
        )}
      </main>

      <Dialog
        isOpen={Boolean(booking)}
        busy={busy}
        onClose={() => setBooking(null)}
        title={t("app.book.title")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBooking(null)} disabled={busy}>
              {t("app.dialog.cancel")}
            </Button>
            <Button onClick={confirmBooking} loading={busy}>
              {t("app.book.confirm")}
            </Button>
          </>
        }
      >
        {bookError && <Alert variant="error">{bookError}</Alert>}
        <div>
          <label htmlFor="demo-at" className="block text-xs font-display font-bold mb-1">
            {t("app.book.label")}
          </label>
          <input
            id="demo-at"
            type="datetime-local"
            value={when}
            min={earliest}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full min-h-11 px-3.5 py-2.5 rounded-xl text-base font-body bg-bg-card border border-border focus:border-orange focus:ring-3 focus:ring-orange/15 focus:outline-hidden text-fg"
          />
          <p className="text-xs text-fg-muted mt-1">{t("app.book.hint")}</p>
        </div>
      </Dialog>

      <BottomNav />
    </div>
  );
}
