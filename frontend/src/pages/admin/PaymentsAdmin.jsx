import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import { useTranslation } from "../../i18n";
import { formatDateTime } from "../../utils/dateTime";
import { getFormError } from "../../api/errors";
import {
  answerCall,
  getAdminCommissions,
  getAdminPayments,
  getCallList,
  markCommissionPaid,
  rejectPayment,
  verifyPayment,
  waiveCommission,
} from "../../api/admin";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Header } from "../../components/layout/Header";

const TABS = ["payments", "commissions", "calls"];
const PAYMENT_STATUSES = ["pending", "verified", "rejected"];
const COMMISSION_STATUSES = ["pending", "paid", "waived"];

function Chips({ options, value, counts, label, text, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`min-h-11 px-4 rounded-full text-sm font-display font-semibold border cursor-pointer ${
            value === option
              ? "bg-orange text-on-orange border-orange"
              : "bg-bg-card text-fg-secondary border-border"
          }`}
        >
          {text(option)}
          {counts ? ` (${counts[option] ?? 0})` : ""}
        </button>
      ))}
    </div>
  );
}

function Row({ title, lines, badge, children }) {
  return (
    <li className="bg-bg-card border border-border rounded-lg p-4 shadow-card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display font-bold text-fg min-w-0 break-words">{title}</h2>
        {badge}
      </div>
      {lines.filter(Boolean).map((line, i) => (
        <p key={i} className="text-sm text-fg-secondary break-words">
          {line}
        </p>
      ))}
      {children && <div className="flex flex-wrap gap-2 pt-1">{children}</div>}
    </li>
  );
}

/** Admin: verify bKash payments, track commissions, phone guardians who did not answer. */
export default function PaymentsAdmin() {
  const { t, has, lang } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "payments";
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [commissionStatus, setCommissionStatus] = useState("pending");
  const [data, setData] = useState({ key: "", status: "loading", body: null });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const [asking, setAsking] = useState(null); // { kind: "reject" | "waive", id }
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(null);

  const requestKey = `${tab}#${paymentStatus}#${commissionStatus}#${attempt}`;
  const state = data.key === requestKey ? data.status : "loading";

  useEffect(() => {
    let cancelled = false;
    const load =
      tab === "payments"
        ? getAdminPayments({ status: paymentStatus })
        : tab === "commissions"
          ? getAdminCommissions({ status: commissionStatus })
          : getCallList().then((rows) => ({ results: rows, counts: null }));
    load
      .then((body) => !cancelled && setData({ key: requestKey, status: "ready", body }))
      .catch(() => !cancelled && setData({ key: requestKey, status: "error", body: null }));
    return () => {
      cancelled = true;
    };
  }, [tab, paymentStatus, commissionStatus, requestKey]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const run = async (action) => {
    setBusy(true);
    setFlash(null);
    try {
      await action();
      setFlash({ variant: "success", text: t("admin.pay.done") });
      reload();
      return true;
    } catch (err) {
      setFlash({ variant: "error", text: getFormError(err, { t, has }) || t("error.generic") });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmReason = async () => {
    const text = reason.trim();
    if (text.length < 5) {
      setReasonError(t("error.reason_too_short"));
      return;
    }
    const act =
      asking.kind === "reject"
        ? () => rejectPayment(asking.id, text)
        : () => waiveCommission(asking.id, text);
    if (await run(act)) {
      setAsking(null);
      setReason("");
    }
  };

  const openAsking = (kind, id) => {
    setReason("");
    setReasonError(null);
    setAsking({ kind, id });
  };

  const items = state === "ready" ? data.body.results : [];
  const counts = state === "ready" ? data.body.counts : null;

  return (
    <div className="min-h-dvh bg-bg-subtle text-fg pb-10">
      <div className="hidden md:block">
        <Header />
      </div>

      <header className="md:hidden sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto px-2 h-14 flex items-center gap-1">
          <Link
            to="/admin/dashboard"
            aria-label={t("common.back")}
            className="w-11 h-11 flex items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-bg-subtle"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </Link>
          <h1 className="text-lg font-display font-bold flex-1">{t("admin.pay.title")}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 flex flex-col gap-3">
        <div role="tablist" className="grid grid-cols-3 gap-1 p-1 bg-bg-card border border-border rounded-full">
          {TABS.map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              onClick={() => setParams(name === "payments" ? {} : { tab: name })}
              className={`min-h-11 rounded-full text-sm font-display font-semibold cursor-pointer ${
                tab === name ? "bg-orange text-on-orange" : "text-fg-secondary"
              }`}
            >
              {t(`admin.pay.tab.${name}`)}
            </button>
          ))}
        </div>

        {tab === "payments" && (
          <Chips
            options={PAYMENT_STATUSES}
            value={paymentStatus}
            counts={counts}
            label={t("admin.pay.tab.payments")}
            text={(status) => t(`pay.payStatus.${status}`)}
            onChange={setPaymentStatus}
          />
        )}
        {tab === "commissions" && (
          <Chips
            options={COMMISSION_STATUSES}
            value={commissionStatus}
            counts={counts}
            label={t("admin.pay.tab.commissions")}
            text={(status) => t(`pay.status.${status}`)}
            onChange={setCommissionStatus}
          />
        )}
        {tab === "calls" && <p className="text-sm text-fg-secondary">{t("admin.calls.intro")}</p>}

        {flash && <Alert variant={flash.variant}>{flash.text}</Alert>}

        {state === "loading" && (
          <p role="status" className="text-sm text-fg-secondary text-center py-10">
            {t("common.loading")}
          </p>
        )}
        {state === "error" && (
          <div role="alert" className="bg-bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
            <p className="text-sm text-error">{t("admin.pay.loadFailed")}</p>
            <Button variant="outline" onClick={reload}>
              {t("common.retry")}
            </Button>
          </div>
        )}
        {state === "ready" && items.length === 0 && (
          <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-sm text-fg-secondary">
              {tab === "calls" ? t("admin.calls.empty") : t("admin.pay.empty")}
            </p>
          </div>
        )}

        {state === "ready" && items.length > 0 && (
          <ul className="flex flex-col gap-3">
            {tab === "payments" &&
              items.map((p) => (
                <Row
                  key={p.id}
                  title={`${t(`pay.purpose.${p.purpose}`)} · ৳${p.amount}`}
                  badge={<Badge variant="tag">{t(`pay.payStatus.${p.status}`)}</Badge>}
                  lines={[
                    `${p.tutor_name} · ${p.tutor_phone}`,
                    `TrxID ${p.transaction_id} · ${t("admin.pay.from", { number: p.sender_number })}`,
                    formatDateTime(p.created_at, lang),
                    p.reject_reason,
                  ]}
                >
                  {p.status === "pending" && (
                    <>
                      <Button size="sm" disabled={busy} onClick={() => run(() => verifyPayment(p.id))}>
                        {t("admin.pay.verify")}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => openAsking("reject", p.id)}>
                        {t("admin.pay.reject")}
                      </Button>
                    </>
                  )}
                </Row>
              ))}
            {tab === "commissions" &&
              items.map((c) => (
                <Row
                  key={c.id}
                  title={`${c.tutor_name} · ৳${c.amount}`}
                  badge={
                    <Badge variant={c.overdue ? "tag" : "free"} className={c.overdue ? "text-error border-error/40" : ""}>
                      {c.overdue ? t("pay.commission.overdue") : t(`pay.status.${c.status}`)}
                    </Badge>
                  }
                  lines={[
                    c.tutor_phone,
                    t("pay.commission.due", {
                      date: new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "bn-BD", {
                        dateStyle: "medium",
                      }).format(new Date(c.due_date)),
                    }),
                    c.suspended && t("admin.pay.suspended"),
                    c.payment?.status === "pending" && t("pay.payment.pending"),
                    c.note,
                  ]}
                >
                  {c.status === "pending" && (
                    <>
                      <Button size="sm" disabled={busy} onClick={() => run(() => markCommissionPaid(c.id))}>
                        {t("admin.pay.markPaid")}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => openAsking("waive", c.id)}>
                        {t("admin.pay.waive")}
                      </Button>
                    </>
                  )}
                </Row>
              ))}
            {tab === "calls" &&
              items.map((m) => (
                <Row
                  key={m.id}
                  title={`${t("admin.calls.guardian")}: ${m.guardian_name}`}
                  lines={[
                    m.guardian_phone,
                    `${t("admin.calls.tutor")}: ${m.tutor_name}${m.area ? ` · ${m.area}` : ""}`,
                    t("admin.calls.demo", { when: formatDateTime(m.demo_at, lang) }),
                  ]}
                >
                  {m.guardian_phone && (
                    <a
                      href={`tel:${m.guardian_phone}`}
                      className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-display font-semibold text-orange-text"
                    >
                      <Phone className="w-4 h-4" aria-hidden />
                      {m.guardian_phone}
                    </a>
                  )}
                  {m.whatsapp_url && (
                    <a
                      href={m.whatsapp_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-display font-semibold text-orange-text"
                    >
                      <MessageCircle className="w-4 h-4" aria-hidden />
                      {t("admin.calls.whatsapp")}
                    </a>
                  )}
                  <Button size="sm" disabled={busy} onClick={() => run(() => answerCall(m.id, "yes"))}>
                    {t("admin.calls.yes")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => answerCall(m.id, "no"))}>
                    {t("admin.calls.no")}
                  </Button>
                </Row>
              ))}
          </ul>
        )}
      </main>

      <Dialog
        isOpen={Boolean(asking)}
        busy={busy}
        onClose={() => setAsking(null)}
        title={asking?.kind === "waive" ? t("admin.pay.waiveTitle") : t("admin.pay.rejectTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAsking(null)} disabled={busy}>
              {t("admin.pay.cancel")}
            </Button>
            <Button
              variant={asking?.kind === "reject" ? "danger" : "primary"}
              onClick={confirmReason}
              loading={busy}
            >
              {t("admin.pay.confirm")}
            </Button>
          </>
        }
      >
        <div>
          <label htmlFor="pay-reason" className="block text-xs font-display font-bold mb-1">
            {t("admin.pay.reason")}
          </label>
          <textarea
            id="pay-reason"
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={Boolean(reasonError)}
            className="w-full px-3.5 py-2.5 rounded-xl text-base font-body bg-bg-card border border-border focus:border-orange focus:ring-3 focus:ring-orange/15 focus:outline-hidden text-fg"
          />
          {reasonError && (
            <p role="alert" className="text-sm text-error mt-1">
              {reasonError}
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
