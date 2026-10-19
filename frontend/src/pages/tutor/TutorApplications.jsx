import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Send } from "lucide-react";
import { useTranslation } from "../../i18n";
import { labelOf } from "../../utils/lookups";
import { formatDateTime } from "../../utils/dateTime";
import { getMyApplications } from "../../api/applications";
import { getPaymentInfo, payUnlock } from "../../api/payments";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Header } from "../../components/layout/Header";
import { BottomNav } from "../../components/layout/BottomNav";
import { ContactCard } from "../../components/applications/ContactCard";
import { PayDialog } from "../../components/payments/PayDialog";
import { budgetText, headline } from "../../components/requirements/requirementText";

const STATUS_VARIANT = {
  applied: "tag",
  viewed: "verified",
  shortlisted: "featured",
  rejected: "tag",
};

function ApplicationCard({ item, onPay }) {
  const ctx = useTranslation();
  const { t, lang } = ctx;
  const requirement = item.requirement;

  return (
    <li className="bg-bg-card border border-border rounded-lg p-4 shadow-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display font-bold text-fg min-w-0 break-words">
          {headline(requirement, lang, t("req.untitled"))}
        </h2>
        <Badge variant={STATUS_VARIANT[item.status] || "tag"} className="shrink-0">
          {t(`app.status.${item.status}`)}
        </Badge>
      </div>
      <p className="text-sm text-fg-secondary flex items-center gap-1.5">
        <MapPin className="w-4 h-4 shrink-0" aria-hidden />
        {[labelOf(requirement.area, lang), budgetText(requirement, ctx)].join(" · ")}
      </p>
      {item.message && <p className="text-sm text-fg-secondary break-words">“{item.message}”</p>}
      <p className="text-xs text-fg-muted">
        {t("app.mine.sentOn", { when: formatDateTime(item.created_at, lang) })}
      </p>

      {item.demo_at && (
        <p className="text-sm font-display font-semibold text-fg">
          {t("app.demo.at", { when: formatDateTime(item.demo_at, lang) })}
        </p>
      )}
      {item.contact && <ContactCard contact={item.contact} title={t("app.contact.guardian")} />}
      {item.demo_at && !item.contact && item.unlock_fee != null && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg-secondary">
            {item.payment?.status === "pending"
              ? t("app.unlock.verifying")
              : t("app.unlock.pending", { fee: item.unlock_fee })}
          </p>
          {item.payment?.status === "rejected" && (
            <p role="alert" className="text-sm text-error">
              {t("app.unlock.rejected", { reason: item.payment.reject_reason })}
            </p>
          )}
          {item.payment?.status !== "pending" && (
            <Button className="w-full sm:w-auto sm:self-start" onClick={() => onPay(item)}>
              {t("app.unlock.pay", { fee: item.unlock_fee })}
            </Button>
          )}
        </div>
      )}
      {!item.demo_at && item.status === "shortlisted" && (
        <p className="text-xs text-fg-muted">{t("app.contact.closed")}</p>
      )}
    </li>
  );
}

/** The tutor's own applications, what happened to each, and the guardian's contact after a demo. */
export default function TutorApplications() {
  const { t } = useTranslation();
  const [state, setState] = useState({ status: "loading", items: [] });
  const [attempt, setAttempt] = useState(0);
  const [paying, setPaying] = useState(null);
  const [number, setNumber] = useState("");
  const [sent, setSent] = useState(false);

  const startPaying = async (item) => {
    try {
      setNumber((await getPaymentInfo()).number);
      setPaying(item);
    } catch {
      setState({ status: "error", items: [] });
    }
  };

  useEffect(() => {
    let cancelled = false;
    getMyApplications()
      .then((items) => !cancelled && setState({ status: "ready", items }))
      .catch(() => !cancelled && setState({ status: "error", items: [] }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div className="min-h-dvh bg-bg-subtle text-fg pb-28 md:pb-10">
      <div className="hidden md:block">
        <Header />
      </div>

      <header className="md:hidden sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-2 h-14 flex items-center gap-1">
          <Link
            to="/dashboard"
            className="w-11 h-11 flex items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-bg-subtle"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </Link>
          <h1 className="text-lg font-display font-bold flex-1">{t("app.mine.title")}</h1>
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
            <p className="text-sm text-error">{t("app.mine.loadFailed")}</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setState({ status: "loading", items: [] });
                setAttempt((n) => n + 1);
              }}
            >
              {t("common.retry")}
            </Button>
          </div>
        )}
        {state.status === "ready" && state.items.length === 0 && (
          <div className="bg-bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3 text-center">
            <Send className="w-8 h-8 text-fg-muted" aria-hidden />
            <p className="text-sm text-fg-secondary">{t("app.mine.empty")}</p>
            <Link to="/tutor/requirements" className="w-full">
              <Button className="w-full">{t("app.mine.find")}</Button>
            </Link>
          </div>
        )}
        {state.status === "ready" && state.items.length > 0 && (
          <>
            <p className="text-sm text-fg-secondary">{t("app.mine.intro")}</p>
            <ul className="flex flex-col gap-3">
              {state.items.map((item) => (
                <ApplicationCard key={item.id} item={item} onPay={startPaying} />
              ))}
            </ul>
          </>
        )}
      </main>

      {paying && (
        <PayDialog
          amount={paying.unlock_fee}
          number={number}
          submit={(body) => payUnlock(paying.id, body)}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null);
            setSent(true);
            setAttempt((n) => n + 1);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}
