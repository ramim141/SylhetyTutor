import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Clock, FileEdit, RefreshCw, TriangleAlert } from "lucide-react";
import { useTranslation } from "../../i18n";
import { getMyProfile } from "../../api/tutors";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";

const TONES = {
  draft: "bg-orange-pale border-orange/20",
  pending: "bg-info-bg border-info/20",
  rejected: "bg-error-bg border-error/30",
  approved: "bg-success-bg border-success/30",
};

function ActionLink({ to, variant = "primary", children }) {
  return (
    <Link to={to} className="block">
      <Button variant={variant} className="w-full">
        {children}
      </Button>
    </Link>
  );
}

/** Where the tutor's profile stands, and the one next thing to do about it. */
export function TutorStatusCard() {
  const { t, lang } = useTranslation();
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `status#${reloadKey}`;
  const [result, setResult] = useState({ key: null, status: "loading", profile: null });
  const state = result.key === requestKey ? result.status : "loading";
  const profile = result.profile;

  useEffect(() => {
    const controller = new AbortController();
    getMyProfile({ signal: controller.signal })
      .then((mine) => setResult({ key: requestKey, status: "ready", profile: mine }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, status: "error", profile: null });
        }
      });
    return () => controller.abort();
  }, [requestKey]);

  if (state === "loading") {
    return (
      <div
        role="status"
        aria-label={t("common.loading")}
        className="h-36 rounded-lg border border-border skeleton"
      />
    );
  }

  if (state === "error") {
    return (
      <section className="rounded-lg border border-border bg-bg-card p-5 flex flex-col gap-3">
        <Alert variant="error">{t("tr.status.loadError")}</Alert>
        <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
          <RefreshCw className="w-4 h-4" aria-hidden />
          {t("common.retry")}
        </Button>
      </section>
    );
  }

  const status = profile.status;
  const done = profile.required_total - profile.missing.length;
  const started = done > 0;
  const since = profile.submitted_at
    ? new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium" }).format(
        new Date(profile.submitted_at),
      )
    : null;

  const Icon = { draft: FileEdit, pending: Clock, rejected: TriangleAlert, approved: CheckCircle }[
    status
  ];
  const iconTone = {
    draft: "text-orange",
    pending: "text-info",
    rejected: "text-error",
    approved: "text-success",
  }[status];

  return (
    <section
      aria-labelledby="profile-status-title"
      className={`rounded-lg border p-5 flex flex-col gap-4 ${TONES[status]}`}
    >
      <div className="flex gap-3">
        <Icon className={`w-6 h-6 shrink-0 ${iconTone}`} aria-hidden />
        <div className="flex flex-col gap-1 min-w-0">
          <h2 id="profile-status-title" className="font-display font-bold text-fg">
            {t(`tr.status.${status}.title`)}
          </h2>
          {status === "draft" && (
            <>
              <p className="text-sm text-fg-secondary">{t("tr.status.draft.body")}</p>
              <p className="text-sm font-display font-semibold text-fg tabular-nums">
                {t("tr.status.draft.progress", { done, total: profile.required_total })}
              </p>
            </>
          )}
          {status === "pending" && (
            <>
              <p className="text-sm text-fg-secondary">{t("tr.status.pending.body")}</p>
              {since && (
                <p className="text-xs text-fg-muted">
                  {t("tr.status.pending.since", { date: since })}
                </p>
              )}
            </>
          )}
          {status === "rejected" && (
            <p className="text-sm text-fg-secondary">
              {t("tr.status.rejected.reason")}{" "}
              <span className="font-semibold text-fg">{profile.rejection_reason}</span>
            </p>
          )}
          {status === "approved" && (
            <p className="text-sm text-fg-secondary">{t("tr.status.approved.body")}</p>
          )}
        </div>
      </div>

      {status === "draft" && (
        <>
          <div
            role="progressbar"
            aria-label={t("tr.progress")}
            aria-valuemin={0}
            aria-valuemax={profile.required_total}
            aria-valuenow={done}
            className="h-2 rounded-full bg-bg-card border border-border overflow-hidden"
          >
            <div
              className="h-full bg-orange"
              style={{ width: `${(done / profile.required_total) * 100}%` }}
            />
          </div>
          <ActionLink to="/tutor/profile">
            {started ? t("tr.status.continue") : t("tr.status.start")}
          </ActionLink>
        </>
      )}
      {status === "rejected" && (
        <ActionLink to="/tutor/profile">{t("tr.status.rejected.fix")}</ActionLink>
      )}
      {status === "approved" && (
        <div className="flex flex-col sm:flex-row gap-2">
          {profile.slug && (
            <div className="flex-1">
              <ActionLink to={`/tutors/${profile.slug}`}>{t("tr.status.view")}</ActionLink>
            </div>
          )}
          <div className="flex-1">
            <ActionLink to="/tutor/profile" variant="outline">
              {t("tr.status.edit")}
            </ActionLink>
          </div>
        </div>
      )}
    </section>
  );
}

export default TutorStatusCard;
