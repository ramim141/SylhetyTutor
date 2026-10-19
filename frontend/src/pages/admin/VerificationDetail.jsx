import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "../../i18n";
import { approveProfile, getApproval, getApprovals, rejectProfile } from "../../api/admin";
import { getFieldErrors, getFormError } from "../../api/errors";
import { labelOf } from "../../utils/lookups";
import { timeAgo } from "../../utils/timeAgo";
import { DocumentViewer } from "../../components/admin/DocumentViewer";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Header } from "../../components/layout/Header";

const CHECKS = ["name", "university", "clear"];
const REASON_CHIPS = ["nid", "studentId", "mismatch"];
const REASON_MIN = 10;
const REASON_MAX = 500;

function Row({ label, value }) {
  return (
    <div className="py-2.5 flex flex-col gap-0.5">
      <dt className="text-xs text-fg-secondary">{label}</dt>
      <dd className="font-display font-semibold text-fg break-words">{value || "—"}</dd>
    </div>
  );
}

function Names({ items, lang }) {
  return items.length ? items.map((item) => labelOf(item, lang)).join(", ") : "—";
}

function Section({ title, children }) {
  return (
    <section className="bg-bg-card border border-border rounded-lg px-5 py-4 shadow-card">
      <h2 className="text-sm font-display font-bold text-fg-secondary mb-1">{title}</h2>
      {children}
    </section>
  );
}

export default function VerificationDetail() {
  const { id } = useParams();
  const { t, has, lang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${id}#${attempt}`;
  const [result, setResult] = useState({ key: null, status: "loading", data: null });
  const state = result.key === requestKey ? result.status : "loading";
  const detail = result.data;

  const [checked, setChecked] = useState({});
  const [dialog, setDialog] = useState(null); // 'approve' | 'reject'
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null); // { variant, text }
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getApproval(id, { signal: controller.signal })
      .then((data) => setResult({ key: requestKey, status: "ready", data }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          status: err.response?.status === 404 ? "missing" : "error",
          data: null,
        });
      });
    return () => controller.abort();
  }, [id, requestKey]);

  const allChecked = CHECKS.every((name) => checked[name]);
  const canDecide = detail?.status === "pending";

  /** After a decision: straight to the next waiting profile, or back to the (empty) queue. */
  const goNext = async (flash) => {
    try {
      const next = await getApprovals({ status: "pending" });
      if (next.results.length > 0) {
        navigate(`/admin/verification/${next.results[0].id}`, { replace: true, state: { flash } });
        return;
      }
      navigate("/admin/verification", { replace: true, state: { flash, cleared: true } });
    } catch {
      navigate("/admin/verification", { replace: true, state: { flash } });
    }
  };

  const failed = (err) => {
    const code = err.response?.data?.code;
    if (code === "not_pending") {
      setBanner({ variant: "warning", text: t("admin.notPending"), reload: true });
    } else {
      setBanner({ variant: "error", text: getFormError(err, { t, has }) || t("error.generic") });
    }
  };

  const approve = async () => {
    setBusy(true);
    try {
      await approveProfile(id);
      setDialog(null);
      await goNext("approved");
    } catch (err) {
      setDialog(null);
      failed(err);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    const text = reason.trim();
    if (text.length < REASON_MIN) {
      setReasonError(t(text ? "error.reason.too_short" : "error.reason.required"));
      return;
    }
    setBusy(true);
    try {
      await rejectProfile(id, text);
      setDialog(null);
      await goNext("rejected");
    } catch (err) {
      const fieldErrors = getFieldErrors(err, { t, has });
      if (fieldErrors.reason) {
        setReasonError(fieldErrors.reason);
      } else {
        setDialog(null);
        failed(err);
      }
    } finally {
      setBusy(false);
    }
  };

  const pickReason = (chip) => {
    setReason((current) =>
      current ? `${current} ${t(`admin.reject.chip.${chip}`)}` : t(`admin.reject.chip.${chip}`),
    );
    setReasonError(null);
  };

  const openReject = () => {
    setReason("");
    setReasonError(null);
    setDialog("reject");
  };

  return (
    <div className="min-h-dvh bg-bg-subtle text-fg pb-36 md:pb-10">
      <div className="hidden md:block">
        <Header />
      </div>

      <header className="md:hidden sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto px-2 h-14 flex items-center gap-1">
          <Link
            to="/admin/verification"
            aria-label={t("common.back")}
            className="w-11 h-11 flex items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-bg-subtle"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </Link>
          <h1 className="text-lg font-display font-bold truncate">
            {detail?.user.full_name || t("admin.detail.title")}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 flex flex-col gap-4">
        {location.state?.flash && (
          <Alert variant="success">{t(`admin.result.${location.state.flash}`)}</Alert>
        )}
        {banner && (
          <Alert variant={banner.variant}>
            <div className="flex flex-col gap-2">
              <span>{banner.text}</span>
              {banner.reload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBanner(null);
                    setAttempt((n) => n + 1);
                  }}
                >
                  {t("common.retry")}
                </Button>
              )}
            </div>
          </Alert>
        )}

        {state === "loading" && (
          <p role="status" className="text-sm text-fg-secondary text-center py-10">
            {t("common.loading")}
          </p>
        )}
        {state === "missing" && (
          <div
            role="alert"
            className="bg-bg-card border border-border rounded-lg p-5 text-sm text-fg-secondary"
          >
            {t("admin.detail.missing")}
          </div>
        )}
        {state === "error" && (
          <div
            role="alert"
            className="bg-bg-card border border-border rounded-lg p-5 flex flex-col gap-3"
          >
            <p className="text-sm text-error">{t("admin.detail.loadFailed")}</p>
            <Button variant="outline" onClick={() => setAttempt((n) => n + 1)} className="w-full">
              {t("common.retry")}
            </Button>
          </div>
        )}

        {state === "ready" && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={detail.status === "approved" ? "featured" : "verified"}>
                {t(`admin.tab.${detail.status}`)}
              </Badge>
              <span className="text-xs text-fg-muted">
                {t("admin.submitted", { when: timeAgo(detail.submitted_at, lang) })}
              </span>
            </div>
            {detail.status === "rejected" && detail.rejection_reason && (
              <Alert variant="warning" title={t("admin.rejectedReason")}>
                {detail.rejection_reason}
              </Alert>
            )}

            <Section title={t("admin.section.contact")}>
              <dl className="divide-y divide-border-light">
                <Row label={t("dashboard.phone")} value={detail.user.phone} />
                <Row label={t("dashboard.email")} value={detail.user.email} />
              </dl>
            </Section>

            <Section title={t("admin.section.education")}>
              <dl className="divide-y divide-border-light">
                <Row
                  label={t("tr.field.gender")}
                  value={detail.profile.gender ? t(`search.gender.${detail.profile.gender}`) : null}
                />
                <Row
                  label={t("admin.field.university")}
                  value={detail.profile.university && labelOf(detail.profile.university, lang)}
                />
                <Row label={t("admin.field.department")} value={detail.profile.department} />
                <Row label={t("admin.field.year")} value={detail.profile.year} />
                <Row label={t("admin.field.studentId")} value={detail.profile.student_id_number} />
                <Row label={t("admin.field.bio")} value={detail.profile.bio} />
              </dl>
            </Section>

            <Section title={t("admin.section.teaching")}>
              <dl className="divide-y divide-border-light">
                <Row
                  label={t("admin.field.fee")}
                  value={
                    detail.profile.fee_min != null
                      ? `৳${detail.profile.fee_min}–${detail.profile.fee_max}`
                      : null
                  }
                />
                <Row
                  label={t("admin.field.subjects")}
                  value={<Names items={detail.profile.subjects} lang={lang} />}
                />
                <Row
                  label={t("admin.field.classes")}
                  value={<Names items={detail.profile.class_levels} lang={lang} />}
                />
                <Row
                  label={t("admin.field.areas")}
                  value={<Names items={detail.profile.areas} lang={lang} />}
                />
              </dl>
            </Section>

            <Section title={t("admin.section.documents")}>
              <div className="flex flex-col gap-4 py-2">
                <p className="text-xs text-fg-secondary">{t("admin.docs.warning")}</p>
                {detail.documents.length === 0 && (
                  <p className="text-sm text-error">{t("admin.queue.docsMissing")}</p>
                )}
                {detail.documents.map((doc) => (
                  <DocumentViewer key={doc.kind} kind={doc.kind} url={doc.url} />
                ))}
              </div>
            </Section>

            {detail.history.length > 0 && (
              <Section title={t("admin.section.history")}>
                <ul className="divide-y divide-border-light">
                  {detail.history.map((event, index) => (
                    <li key={index} className="py-2.5 text-sm">
                      <span className="font-display font-semibold">
                        {t(`admin.history.${event.action}`)}
                      </span>
                      {event.actor && <span className="text-fg-secondary"> · {event.actor}</span>}
                      <span className="text-fg-muted"> · {timeAgo(event.at, lang)}</span>
                      {event.reason && (
                        <p className="text-fg-secondary mt-0.5 break-words">{event.reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {canDecide && (
              <Section title={t("admin.check.title")}>
                <p className="text-xs text-fg-secondary mb-1">{t("admin.check.hint")}</p>
                <div className="flex flex-col">
                  {CHECKS.map((name) => (
                    <label
                      key={name}
                      className="min-h-11 flex items-center gap-3 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checked[name])}
                        onChange={(e) => setChecked((c) => ({ ...c, [name]: e.target.checked }))}
                        className="w-5 h-5 accent-orange"
                      />
                      {t(`admin.check.${name}`)}
                    </label>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </main>

      {state === "ready" && canDecide && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-bg/95 backdrop-blur-md border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3">
            <Button variant="outline" size="lg" onClick={openReject}>
              {t("admin.reject")}
            </Button>
            <Button
              size="lg"
              disabled={!allChecked || !detail.can_approve}
              onClick={() => setDialog("approve")}
            >
              {t("admin.approve")}
            </Button>
          </div>
          {!detail.can_approve && detail.missing_fields.length > 0 && (
            <p role="alert" className="max-w-2xl mx-auto mt-2 text-xs text-error">
              {t("admin.incomplete")}
            </p>
          )}
        </div>
      )}

      <Dialog
        isOpen={dialog === "approve"}
        onClose={() => setDialog(null)}
        title={t("admin.approve.confirmTitle")}
        busy={busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={busy}>
              {t("admin.cancel")}
            </Button>
            <Button onClick={approve} loading={busy}>
              {t("admin.approve")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">{t("admin.approve.confirmBody")}</p>
      </Dialog>

      <Dialog
        isOpen={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={t("admin.reject.title")}
        busy={busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={busy}>
              {t("admin.cancel")}
            </Button>
            <Button variant="danger" onClick={reject} loading={busy}>
              {t("admin.reject.submit")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-secondary">{t("admin.reject.hint")}</p>
        <div className="flex flex-wrap gap-2">
          {REASON_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => pickReason(chip)}
              className="min-h-11 px-3 rounded-full border border-border text-sm text-fg-secondary hover:text-fg hover:border-orange cursor-pointer"
            >
              {t(`admin.reject.chipLabel.${chip}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="reject-reason" className="text-sm font-display font-semibold">
            {t("admin.reject.reasonLabel")}
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            maxLength={REASON_MAX}
            rows={4}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError(null);
            }}
            aria-invalid={reasonError ? true : undefined}
            aria-describedby="reject-reason-hint"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base text-fg focus:outline-hidden focus:ring-2 focus:ring-orange/40"
          />
          <div id="reject-reason-hint" className="flex justify-between gap-2 text-xs">
            <span
              role={reasonError ? "alert" : undefined}
              className={reasonError ? "text-error" : "text-fg-muted"}
            >
              {reasonError || t("admin.reject.min", { n: REASON_MIN })}
            </span>
            <span className="text-fg-muted tabular-nums">
              {reason.length}/{REASON_MAX}
            </span>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
