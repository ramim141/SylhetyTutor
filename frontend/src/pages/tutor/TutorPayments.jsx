import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Wallet } from "lucide-react";
import { useTranslation } from "../../i18n";
import { labelOf } from "../../utils/lookups";
import { formatDateTime } from "../../utils/dateTime";
import {
  getMyCommissions,
  getMyPayments,
  getPaymentInfo,
  payCommission,
} from "../../api/payments";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { BottomNav } from "../../components/layout/BottomNav";
import { PayDialog } from "../../components/payments/PayDialog";

const STATUS_VARIANT = { pending: "tag", paid: "featured", waived: "verified", disputed: "tag" };
const PAY_VARIANT = { pending: "tag", verified: "featured", rejected: "tag" };

function CommissionCard({ item, onPay }) {
  const { t, lang } = useTranslation();
  const due = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "bn-BD", {
    dateStyle: "medium",
  }).format(new Date(item.due_date));
  const waiting = item.payment?.status === "pending";
  const canPay = item.status === "pending" && !waiting;

  return (
    <li className="bg-bg-card border border-border rounded-lg p-4 shadow-card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display font-bold text-fg tabular-nums">৳{item.amount}</h3>
        <Badge variant={STATUS_VARIANT[item.status]} className="shrink-0">
          {t(`pay.status.${item.status}`)}
        </Badge>
      </div>
      {item.area && (
        <p className="text-sm text-fg-secondary">
          {t("pay.commission.for", { area: labelOf(item.area, lang) })}
        </p>
      )}
      {item.status === "pending" && (
        <p className={`text-sm ${item.overdue ? "text-error font-semibold" : "text-fg-secondary"}`}>
          {item.overdue ? `${t("pay.commission.overdue")} · ` : ""}
          {t("pay.commission.due", { date: due })}
        </p>
      )}
      {waiting && <p className="text-sm text-fg-secondary">{t("pay.payment.pending")}</p>}
      {item.payment?.status === "rejected" && item.status === "pending" && (
        <p role="alert" className="text-sm text-error">
          {t("pay.payment.rejected", { reason: item.payment.reject_reason })}
        </p>
      )}
      {canPay && (
        <Button className="w-full sm:w-auto sm:self-start" onClick={() => onPay(item)}>
          {item.payment?.status === "rejected"
            ? t("pay.action.payAgain")
            : t("pay.action.pay", { amount: item.amount })}
        </Button>
      )}
    </li>
  );
}

/** What a tutor owes and has paid: commissions (pay by bKash) and the payment history. */
export default function TutorPayments() {
  const { t, lang } = useTranslation();
  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [paying, setPaying] = useState(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyCommissions(), getMyPayments(), getPaymentInfo()])
      .then(([commissions, payments, info]) => {
        if (!cancelled) setState({ status: "ready", commissions, payments, info });
      })
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const done = () => {
    setPaying(null);
    setSent(true);
    reload();
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
          <h1 className="text-lg font-display font-bold flex-1">{t("pay.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-3">
        {sent && <Alert variant="success">{t("pay.sent")}</Alert>}
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
            <p className="text-sm text-error">{t("pay.loadFailed")}</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setState({ status: "loading" });
                reload();
              }}
            >
              {t("common.retry")}
            </Button>
          </div>
        )}
        {state.status === "ready" && (
          <>
            <p className="text-sm text-fg-secondary">{t("pay.intro")}</p>
            {state.commissions.suspended && (
              <Alert variant="error" title={t("pay.suspended.title")}>
                {t("pay.suspended.body")}
              </Alert>
            )}

            <h2 className="font-display font-bold text-fg mt-2">{t("pay.commissions")}</h2>
            {state.commissions.results.length === 0 ? (
              <div className="bg-bg-card border border-border rounded-lg p-6 flex flex-col items-center gap-3 text-center">
                <Wallet className="w-8 h-8 text-fg-muted" aria-hidden />
                <p className="text-sm text-fg-secondary">{t("pay.commissions.empty")}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.commissions.results.map((item) => (
                  <CommissionCard key={item.id} item={item} onPay={setPaying} />
                ))}
              </ul>
            )}

            <h2 className="font-display font-bold text-fg mt-4">{t("pay.history")}</h2>
            {state.payments.length === 0 ? (
              <p className="text-sm text-fg-secondary">{t("pay.history.empty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {[...state.payments].reverse().map((p) => (
                  <li
                    key={p.id}
                    className="bg-bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-display font-semibold text-fg">
                        {t(`pay.purpose.${p.purpose}`)} · ৳{p.amount}
                      </p>
                      <p className="text-xs text-fg-muted font-mono truncate">
                        {p.transaction_id} · {formatDateTime(p.created_at, lang)}
                      </p>
                    </div>
                    <Badge variant={PAY_VARIANT[p.status]} className="shrink-0">
                      {t(`pay.payStatus.${p.status}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      {paying && state.status === "ready" && (
        <PayDialog
          amount={paying.amount}
          number={state.info.number}
          submit={(body) => payCommission(paying.id, body)}
          onClose={() => setPaying(null)}
          onDone={done}
        />
      )}

      <BottomNav />
    </div>
  );
}
