import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, GraduationCap, Lock, RefreshCw, Star } from "lucide-react";
import { useTranslation } from "../i18n";
import { getTutor } from "../api/tutors";
import { labelOf } from "../utils/lookups";
import { yearKey } from "../components/tutor/registration/steps";
import { Header } from "../components/layout/Header";
import { BottomNav } from "../components/layout/BottomNav";
import { AvailabilityGrid } from "../components/tutor/AvailabilityGrid";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

const CONTAINER = "max-w-[900px] mx-auto px-4 md:px-6";

function Section({ title, hint, children }) {
  return (
    <section className="bg-bg-card border border-border rounded-lg p-5 shadow-card flex flex-col gap-3">
      <div>
        <h2 className="font-display font-bold text-lg">{title}</h2>
        {hint && <p className="text-xs text-fg-muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Chips({ items, lang }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.slug}
          className="px-3 py-1 rounded-full border border-border bg-bg-subtle text-sm font-medium"
        >
          {labelOf(item, lang)}
        </li>
      ))}
    </ul>
  );
}

function ProfileSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4" role="status" aria-label={t("profile.loading")}>
      <div className="h-44 rounded-lg skeleton" />
      <div className="h-32 rounded-lg skeleton" />
      <div className="h-56 rounded-lg skeleton" />
    </div>
  );
}

export default function TutorProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const [reloadKey, setReloadKey] = useState(0);
  // The answer remembers which request it belongs to, so a new slug (or a retry) reads as
  // "loading" straight away and never shows the previous tutor
  const requestKey = `${slug}#${reloadKey}`;
  const [result, setResult] = useState({ key: null, status: "loading", tutor: null });
  const state = result.key === requestKey ? result.status : "loading";
  const tutor = result.tutor;

  useEffect(() => {
    const controller = new AbortController();
    getTutor(slug, { signal: controller.signal })
      .then((data) => setResult({ key: requestKey, status: "ready", tutor: data }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        const status = err?.response?.status === 404 ? "notfound" : "error";
        setResult({ key: requestKey, status, tutor: null });
      });
    return () => controller.abort();
  }, [slug, requestKey]);

  // Browser tab title (full SEO tags come in Sprint 7)
  useEffect(() => {
    if (state !== "ready") return undefined;
    const previous = document.title;
    document.title = `${tutor.name} | SylhetyTutor`;
    return () => {
      document.title = previous;
    };
  }, [state, tutor]);

  // Back to the search the visitor came from (filters and page intact), else to the list
  const goBack = (event) => {
    if (window.history.state?.idx > 0) {
      event.preventDefault();
      navigate(-1);
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-fg pb-28 md:pb-10">
      <Header />

      <main className={`${CONTAINER} py-5 md:py-8 flex flex-col gap-4`}>
        <Link
          to="/tutors"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 min-h-11 -ml-2 px-2 font-display font-semibold text-sm text-fg-secondary hover:text-fg self-start"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {t("profile.back")}
        </Link>

        {state === "loading" && <ProfileSkeleton />}

        {state === "error" && (
          <div className="max-w-md mx-auto flex flex-col items-center gap-4 py-8 text-center">
            <Alert variant="error">{t("profile.error")}</Alert>
            <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw className="w-4 h-4" aria-hidden />
              {t("common.retry")}
            </Button>
          </div>
        )}

        {state === "notfound" && (
          <div className="max-w-lg mx-auto text-center py-10 px-6 bg-bg-card rounded-lg border border-border flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-orange-light text-orange-text flex items-center justify-center">
              <GraduationCap className="w-7 h-7" aria-hidden />
            </div>
            <h1 className="font-display font-bold text-lg">{t("profile.notFoundTitle")}</h1>
            <p className="text-sm text-fg-secondary max-w-prose">{t("profile.notFoundBody")}</p>
            <Link to="/tutors" className="mt-2">
              <Button variant="outline">{t("profile.browse")}</Button>
            </Link>
          </div>
        )}

        {state === "ready" && (
          <>
            <header
              className={`rounded-lg p-5 shadow-card flex flex-col sm:flex-row gap-4 sm:items-center ${
                tutor.isFeatured
                  ? "border-2 border-featured-border bg-featured-bg"
                  : "border border-border bg-bg-card"
              }`}
            >
              {tutor.avatarUrl ? (
                <img
                  src={tutor.avatarUrl}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <div
                  aria-hidden
                  className="w-24 h-24 rounded-full bg-bg-subtle border border-border flex items-center justify-center font-display font-bold text-navy text-3xl shrink-0 select-none"
                >
                  {tutor.initials}
                </div>
              )}

              <div className="min-w-0 flex flex-col gap-1.5">
                {tutor.isFeatured && (
                  <div>
                    <Badge variant="featured" icon={<Star className="w-3 h-3 fill-current" />}>
                      {t("card.featured")}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-extrabold text-2xl leading-tight">
                    {tutor.name}
                  </h1>
                  {tutor.isVerified && (
                    <span title={t("card.verifiedTitle")} className="inline-flex">
                      <CheckCircle className="w-5 h-5 text-info" aria-hidden />
                      <span className="sr-only">{t("card.verifiedTitle")}</span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-fg-secondary">
                  {[
                    labelOf(tutor.university, lang),
                    tutor.department,
                    yearKey(tutor.year) ? t(yearKey(tutor.year)) : tutor.year,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <div className="flex items-center gap-3 flex-wrap mt-1 text-sm">
                  {tutor.reviewCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 font-display font-bold tabular-nums">
                      <Star className="w-4 h-4 text-star fill-star" aria-hidden />
                      {Number(tutor.rating).toFixed(1)}
                      <span className="text-fg-muted font-normal">({tutor.reviewCount})</span>
                    </span>
                  ) : (
                    // No reviews yet: say so instead of showing 0.0 or an invented score
                    <Badge variant="free">{t("card.new")}</Badge>
                  )}
                  {tutor.feeMin != null && tutor.feeMax != null && (
                    <span className="text-fg-muted">
                      {t("card.salary")}:{" "}
                      <span className="font-display font-bold text-fg tabular-nums">
                        ৳{tutor.feeMin.toLocaleString("en-IN")}–
                        {tutor.feeMax.toLocaleString("en-IN")}
                      </span>
                      {t("card.perMonth")}
                    </span>
                  )}
                </div>
              </div>
            </header>

            {tutor.bio && (
              <Section title={t("profile.about")}>
                <p className="text-fg-secondary whitespace-pre-line max-w-prose">{tutor.bio}</p>
              </Section>
            )}

            {tutor.subjects.length > 0 && (
              <Section title={t("profile.subjects")}>
                <Chips items={tutor.subjects} lang={lang} />
              </Section>
            )}

            {tutor.classLevels.length > 0 && (
              <Section title={t("profile.classes")}>
                <Chips items={tutor.classLevels} lang={lang} />
              </Section>
            )}

            {tutor.areas.length > 0 && (
              <Section title={t("profile.areas")}>
                <Chips items={tutor.areas} lang={lang} />
              </Section>
            )}

            <Section title={t("profile.availability")} hint={t("profile.availabilityHint")}>
              {tutor.availability.length > 0 ? (
                <AvailabilityGrid availability={tutor.availability} />
              ) : (
                <p className="text-sm text-fg-muted">{t("profile.noAvailability")}</p>
              )}
            </Section>

            <Section title={t("profile.reviews")}>
              <p className="text-sm text-fg-secondary">{t("profile.reviewsEmpty")}</p>
            </Section>

            <p className="flex items-start gap-2 text-sm text-fg-secondary px-1">
              <Lock className="w-4 h-4 mt-0.5 shrink-0 text-fg-muted" aria-hidden />
              {t("profile.contactNote")}
            </p>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
