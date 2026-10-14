import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, MapPin } from "lucide-react";
import { useTranslation } from "../../i18n";
import { labelOf } from "../../utils/lookups";
import { timeAgo } from "../../utils/timeAgo";
import { getMatchingRequirements } from "../../api/requirements";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { BottomNav } from "../../components/layout/BottomNav";
import { budgetText, headline } from "../../components/requirements/requirementText";

function MatchCard({ item }) {
  const ctx = useTranslation();
  const { t, lang } = ctx;

  return (
    <li className="bg-bg-card border border-border rounded-lg p-4 shadow-card flex flex-col gap-2">
      <h2 className="font-display font-bold text-fg break-words">
        {headline(item, lang, t("req.untitled"))}
      </h2>
      <p className="text-sm text-fg-secondary flex items-center gap-1.5">
        <MapPin className="w-4 h-4 shrink-0" aria-hidden />
        {labelOf(item.area, lang)}
      </p>
      <p className="text-sm text-fg-secondary">
        {[budgetText(item, ctx), t(`req.gender.${item.preferred_gender}`)].join(" · ")}
      </p>
      {item.schedule_note && (
        <p className="text-sm text-fg-secondary break-words">{item.schedule_note}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={item.budget_fits ? "featured" : "tag"}>
          {item.budget_fits ? t("match.fits") : t("match.noFit")}
        </Badge>
        <span className="text-xs text-fg-muted">
          {t("match.posted", { when: timeAgo(item.published_at, lang === "mixed" ? "bn" : lang) })}
        </span>
      </div>
      <p className="text-xs text-fg-muted">{t("match.contactNote")}</p>
    </li>
  );
}

/** Open requirements that suit an approved tutor. Others see why it is locked, not an error. */
export default function TutorRequirements() {
  const { t } = useTranslation();
  const [state, setState] = useState({ status: "loading", items: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMatchingRequirements()
      .then((data) => !cancelled && setState({ status: "ready", items: data.results }))
      .catch((err) => {
        if (cancelled) return;
        setState({ status: err?.response?.status === 403 ? "locked" : "error", items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

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
          <h1 className="text-lg font-display font-bold flex-1">{t("match.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-3">
        {state.status === "loading" && (
          <p role="status" className="text-sm text-fg-secondary text-center py-10">
            {t("common.loading")}
          </p>
        )}
        {state.status === "locked" && (
          <div className="bg-bg-card border border-border rounded-lg p-6 flex flex-col items-center gap-3 text-center">
            <Lock className="w-8 h-8 text-fg-muted" aria-hidden />
            <h2 className="font-display font-bold text-fg">{t("match.locked.title")}</h2>
            <p className="text-sm text-fg-secondary">{t("match.locked.body")}</p>
            <Link to="/tutor/profile" className="w-full">
              <Button className="w-full">{t("match.locked.cta")}</Button>
            </Link>
          </div>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="bg-bg-card border border-border rounded-lg p-5 flex flex-col gap-3"
          >
            <p className="text-sm text-error">{t("match.loadFailed")}</p>
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
        {state.status === "ready" && (
          <>
            <p className="text-sm text-fg-secondary">{t("match.intro")}</p>
            {state.items.length === 0 ? (
              <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-sm text-fg-secondary">{t("match.empty")}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.items.map((item) => (
                  <MatchCard key={item.id} item={item} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
