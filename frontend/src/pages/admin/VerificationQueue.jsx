import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileWarning } from "lucide-react";
import { useTranslation } from "../../i18n";
import { getApprovals } from "../../api/admin";
import { timeAgo } from "../../utils/timeAgo";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

const TABS = ["pending", "approved", "rejected"];

function QueueCard({ row }) {
  const { t, lang } = useTranslation();
  const fee = row.fee_min != null && row.fee_max != null ? `৳${row.fee_min}–${row.fee_max}` : null;
  return (
    <li>
      <Link
        to={`/admin/verification/${row.id}`}
        className="block bg-bg-card border border-border rounded-lg p-4 shadow-card hover:border-orange/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange/50"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display font-bold text-fg truncate">{row.full_name}</h2>
          <span className="shrink-0 text-xs text-fg-muted">{timeAgo(row.submitted_at, lang)}</span>
        </div>
        <p className="text-sm text-fg-secondary truncate">
          {[row.university, row.department].filter(Boolean).join(" · ") || "—"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {fee && <Badge variant="tag">{fee}</Badge>}
          {!row.has_all_documents && (
            <Badge variant="tag" className="text-error border-error/40">
              <FileWarning className="w-3.5 h-3.5" aria-hidden />
              {t("admin.queue.docsMissing")}
            </Badge>
          )}
        </div>
      </Link>
    </li>
  );
}

export default function VerificationQueue() {
  const { t } = useTranslation();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const status = TABS.includes(params.get("status")) ? params.get("status") : "pending";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${status}#${page}#${attempt}`;
  const [result, setResult] = useState({ key: null, status: "loading", data: null });
  const state = result.key === requestKey ? result.status : "loading";
  const data = result.data;
  const flash = location.state?.flash;

  useEffect(() => {
    const controller = new AbortController();
    getApprovals({ status, page }, { signal: controller.signal })
      .then((body) => setResult({ key: requestKey, status: "ready", data: body }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key: requestKey, status: "error", data: null });
      });
    return () => controller.abort();
  }, [status, page, requestKey]);

  const openTab = (tab) => setParams(tab === "pending" ? {} : { status: tab });
  const goToPage = (next) => {
    const query = {};
    if (status !== "pending") query.status = status;
    if (next > 1) query.page = String(next);
    setParams(query);
  };

  return (
    <div className="min-h-dvh bg-bg-subtle text-fg pb-10">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto px-2 h-14 flex items-center gap-1">
          <Link
            to="/dashboard"
            aria-label={t("common.back")}
            className="w-11 h-11 flex items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-bg-subtle"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </Link>
          <h1 className="text-lg font-display font-bold">{t("admin.queue.title")}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 flex flex-col gap-4">
        {flash && (
          <Alert variant="success">
            {t(`admin.result.${flash}`)}
            {location.state?.cleared && ` ${t("admin.queue.cleared")}`}
          </Alert>
        )}

        <div
          role="tablist"
          aria-label={t("admin.queue.title")}
          className="grid grid-cols-3 gap-1 p-1 bg-bg-card border border-border rounded-full"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={status === tab}
              onClick={() => openTab(tab)}
              className={`min-h-11 rounded-full text-sm font-display font-semibold transition-colors cursor-pointer ${
                status === tab
                  ? "bg-orange text-on-orange shadow-sm"
                  : "text-fg-secondary hover:text-fg"
              }`}
            >
              {t(`admin.tab.${tab}`)}
              {data?.counts && <span className="ml-1 tabular-nums">({data.counts[tab]})</span>}
            </button>
          ))}
        </div>

        {state === "loading" && (
          <p role="status" className="text-sm text-fg-secondary text-center py-10">
            {t("common.loading")}
          </p>
        )}
        {state === "error" && (
          <div
            role="alert"
            className="bg-bg-card border border-border rounded-lg p-5 flex flex-col gap-3"
          >
            <p className="text-sm text-error">{t("admin.queue.loadFailed")}</p>
            <Button variant="outline" onClick={() => setAttempt((n) => n + 1)} className="w-full">
              {t("common.retry")}
            </Button>
          </div>
        )}
        {state === "ready" && data.results.length === 0 && (
          <div className="bg-bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-fg-muted" aria-hidden />
            <p className="text-sm text-fg-secondary">{t(`admin.queue.empty.${status}`)}</p>
          </div>
        )}
        {state === "ready" && data.results.length > 0 && (
          <>
            <ul className="flex flex-col gap-3">
              {data.results.map((row) => (
                <QueueCard key={row.id} row={row} />
              ))}
            </ul>
            {(page > 1 || data.next) && (
              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                  {t("search.prev")}
                </Button>
                <span className="text-sm text-fg-secondary tabular-nums">{page}</span>
                <Button variant="ghost" disabled={!data.next} onClick={() => goToPage(page + 1)}>
                  {t("search.next")}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
