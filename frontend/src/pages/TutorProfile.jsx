import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  GraduationCap,
  Lock,
  RefreshCw,
  Star,
  AlertTriangle,
  MessageSquarePlus,
} from "lucide-react";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { getTutor } from "../api/tutors";
import { getTutorReviews, getGuardianReviewStatus } from "../api/reviews";
import { labelOf } from "../utils/lookups";
import { yearKey } from "../components/tutor/registration/steps";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { BottomNav } from "../components/layout/BottomNav";
import { AvailabilityGrid } from "../components/tutor/AvailabilityGrid";
import { SEO } from "../components/common/SEO";
import { ReviewDialog } from "../components/reviews/ReviewDialog";
import { ReportDialog } from "../components/safety/ReportDialog";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

const CONTAINER = "max-w-[900px] mx-auto px-4 md:px-6";

function Section({ title, hint, action, children }) {
  return (
    <section className="bg-bg-card border border-border rounded-lg p-5 shadow-card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display font-bold text-lg">{title}</h2>
          {hint && <p className="text-xs text-fg-muted mt-0.5">{hint}</p>}
        </div>
        {action}
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
  const { status: authStatus, user } = useAuthStore();

  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${slug}#${reloadKey}`;
  const [result, setResult] = useState({ key: null, status: "loading", tutor: null });
  const state = result.key === requestKey ? result.status : "loading";
  const tutor = result.tutor;
  const isOwnProfile =
    authStatus === "authenticated" &&
    ((tutor?.userId != null && Number(user?.id) === Number(tutor.userId)) ||
      (user?.tutor_slug && user.tutor_slug === slug));
  const isPeerTutor = user?.role === "tutor" && !isOwnProfile;
  const canReport =
    !isOwnProfile &&
    (authStatus !== "authenticated" || user?.role === "guardian" || user?.role === "tutor");

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [guardianStatus, setGuardianStatus] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

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

  // Load reviews and check review permission when tutor is ready
  useEffect(() => {
    if (state !== "ready" || !tutor?.id) return;
    getTutorReviews(tutor.id)
      .then((data) => {
        setReviews(Array.isArray(data) ? data : (data?.results ?? []));
      })
      .catch(() => {});

    if (authStatus === "authenticated" && user?.role === "guardian") {
      getGuardianReviewStatus(tutor.id)
        .then((data) => setGuardianStatus(data))
        .catch(() => {});
    }
  }, [state, tutor?.id, authStatus, user?.role]);

  const handleReviewSubmitted = (newReview) => {
    setReviews((prev) => [newReview, ...prev]);
    setGuardianStatus({ can_review: false, already_reviewed: true });
    setReloadKey((k) => k + 1); // refresh tutor average
  };

  const goBack = (event) => {
    if (window.history.state?.idx > 0) {
      event.preventDefault();
      navigate(-1);
    }
  };

  // SEO schema
  const jsonLd = tutor
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        name: tutor.name,
        jobTitle: "Home Tutor",
        worksFor: {
          "@type": "EducationalOrganization",
          name: "SylhetyTutor",
        },
        ...(tutor.rating && tutor.reviewCount > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: Number(tutor.rating).toFixed(1),
                reviewCount: tutor.reviewCount,
              },
            }
          : {}),
      }
    : null;

  return (
    <div className="min-h-dvh flex flex-col bg-bg text-fg pb-28 md:pb-0">
      <SEO
        title={tutor ? `${tutor.name} | SylhetyTutor` : "Tutor Profile"}
        description={tutor?.bio?.slice(0, 160) || "Verified university home tutor in Sylhet"}
        jsonLd={jsonLd}
      />
      <Header />

      <main className={`flex-1 ${CONTAINER} py-5 md:py-8 flex flex-col gap-4 w-full`}>
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/tutors"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 min-h-11 -ml-2 px-2 font-display font-semibold text-sm text-fg-secondary hover:text-fg self-start"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {t("profile.back")}
          </Link>

          {state === "ready" && canReport && (
            <button
              type="button"
              onClick={() => {
                if (authStatus !== "authenticated") {
                  navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
                } else {
                  setReportDialogOpen(true);
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-error transition-colors px-2 py-1 rounded"
              title={t("report.button")}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {t("report.button")}
            </button>
          )}
        </div>

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
            {isOwnProfile && (
              <div className="rounded-lg p-4 bg-orange/10 border border-orange/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-fg text-sm">
                    {t("profile.ownProfileTitle")}
                  </h2>
                  <p className="text-xs text-fg-secondary mt-0.5">
                    {t("profile.ownProfileDesc")}
                  </p>
                </div>
                <Link to="/tutor/profile">
                  <Button size="sm" variant="primary">
                    {t("profile.editProfile")}
                  </Button>
                </Link>
              </div>
            )}

            <header
              className={`rounded-lg p-5 shadow-card flex flex-col sm:flex-row gap-4 sm:items-center ${
                !isPeerTutor && tutor.isFeatured
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

              <div className="min-w-0 flex flex-col gap-1.5 flex-1">
                {!isPeerTutor && tutor.isFeatured && (
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

                {!isPeerTutor && (
                  <div className="flex items-center gap-3 flex-wrap mt-1 text-sm">
                    {tutor.reviewCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-display font-bold tabular-nums">
                        <Star className="w-4 h-4 text-star fill-star" aria-hidden />
                        {Number(tutor.rating).toFixed(1)}
                        <span className="text-fg-muted font-normal">({tutor.reviewCount})</span>
                      </span>
                    ) : (
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
                )}
              </div>
            </header>

            {isPeerTutor ? (
              <Section title={t("profile.peerTutorTitle")}>
                <div className="flex items-start gap-3 py-3 text-fg-secondary">
                  <GraduationCap className="w-5 h-5 text-orange shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm leading-relaxed">
                    {t("profile.tutorPeerViewNote")}
                  </p>
                </div>
              </Section>
            ) : (
              <>
                {tutor.bio && (
                  <Section title={t("profile.about")}>
                    <p className="text-fg-secondary whitespace-pre-line max-w-prose">{tutor.bio}</p>
                  </Section>
                )}

            {tutor.subjects?.length > 0 && (
              <Section title={t("profile.subjects")}>
                <Chips items={tutor.subjects} lang={lang} />
              </Section>
            )}

            {tutor.classLevels?.length > 0 && (
              <Section title={t("profile.classes")}>
                <Chips items={tutor.classLevels} lang={lang} />
              </Section>
            )}

            {tutor.areas?.length > 0 && (
              <Section title={t("profile.areas")}>
                <Chips items={tutor.areas} lang={lang} />
              </Section>
            )}

            <Section title={t("profile.availability")} hint={t("profile.availabilityHint")}>
              {tutor.availability?.length > 0 ? (
                <AvailabilityGrid availability={tutor.availability} />
              ) : (
                <p className="text-sm text-fg-muted">{t("profile.noAvailability")}</p>
              )}
            </Section>

                {/* Sprint 7 Reviews Section */}
                <Section
                  title={t("reviews.title")}
                  action={
                    guardianStatus?.can_review ? (
                      <Button
                        size="sm"
                        onClick={() => setReviewDialogOpen(true)}
                        className="flex items-center gap-1.5"
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        {t("reviews.writeReview")}
                      </Button>
                    ) : guardianStatus?.already_reviewed ? (
                      <span className="text-xs font-semibold text-success bg-success-bg px-2.5 py-1 rounded-full">
                        {t("reviews.yourReview")}
                      </span>
                    ) : null
                  }
                >
                  {reviews.length === 0 ? (
                    <p className="text-sm text-fg-secondary py-2">{t("profile.reviewsEmpty")}</p>
                  ) : (
                    <div className="space-y-4 pt-1">
                      {reviews.map((rev) => (
                        <article
                          key={rev.id}
                          className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-semibold text-sm">
                                {rev.reviewer_name}
                              </span>
                              <span className="text-xs text-fg-muted">
                                {rev.created_at?.slice(0, 10)}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 text-star">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < rev.rating ? "fill-star text-star" : "text-border fill-transparent"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {rev.comment && (
                            <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
                              {rev.comment}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </Section>

                <p className="flex items-start gap-2 text-sm text-fg-secondary px-1">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0 text-fg-muted" aria-hidden />
                  {t("profile.contactNote")}
                </p>
              </>
            )}
          </>
        )}
      </main>

      <Footer />
      <BottomNav />

      {/* Dialogs */}
      {tutor && (
        <>
          <ReviewDialog
            isOpen={reviewDialogOpen}
            onClose={() => setReviewDialogOpen(false)}
            tutorId={tutor.id}
            onReviewSubmitted={handleReviewSubmitted}
          />
          <ReportDialog
            isOpen={reportDialogOpen}
            onClose={() => setReportDialogOpen(false)}
            targetUserId={tutor.userId}
            targetSlug={tutor.slug}
            targetName={tutor.name}
          />
        </>
      )}
    </div>
  );
}
