import { ArrowRight, Star, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { labelOf } from "../../utils/lookups";

export function TutorCard({
  id,
  userId,
  slug,
  name,
  initials,
  avatarUrl,
  university = null,
  department = "",
  area = null,
  subjects = [],
  classes = [],
  rating = 0,
  reviewCount = 0,
  feeMin = null,
  feeMax = null,
  isFeatured = false,
  isVerified = true,
  tutor = null,
}) {
  const { t, lang } = useTranslation();

  // If passed as a tutor object (e.g. from some pages)
  const item = tutor || {};
  const effectiveSlug = slug || item.slug;
  const effectiveName = name || item.name;
  const effectiveInitials = initials || item.initials;
  const effectiveAvatar = avatarUrl || item.avatarUrl;
  const effectiveUni = university || item.university;
  const effectiveDept = department || item.department || "";
  const effectiveArea = area || item.area;
  const effectiveSubjects = subjects.length ? subjects : (item.subjects || []);
  const effectiveClasses = classes.length ? classes : (item.classes || []);
  const effectiveRating = rating || item.rating || 0;
  const effectiveReviews = reviewCount || item.reviewCount || 0;
  const effectiveFeeMin = feeMin != null ? feeMin : item.feeMin;
  const effectiveFeeMax = feeMax != null ? feeMax : item.feeMax;
  const effectiveFeatured = isFeatured || item.isFeatured;
  const effectiveVerified = isVerified ?? item.isVerified ?? true;

  const user = useAuthStore((s) => s.user);
  const isPeerTutor = user?.role === "tutor";

  const universityLine = effectiveUni
    ? `${labelOf(effectiveUni, lang)}${effectiveDept ? ` (${effectiveDept})` : ""}`
    : effectiveDept;
  const placeLine = [universityLine, !isPeerTutor && effectiveArea && labelOf(effectiveArea, lang)].filter(Boolean);

  return (
    <div
      className={`group relative rounded-lg p-5 shadow-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out flex flex-col justify-between ${
        !isPeerTutor && effectiveFeatured
          ? "border border-featured-border/70 ring-1 ring-featured-border/25 bg-featured-bg"
          : "border border-border bg-bg-card"
      }`}
    >
      <div>
        {/* Top Header: Featured Badge */}
        {!isPeerTutor && effectiveFeatured && (
          <div className="mb-3">
            <Badge variant="featured" icon={<Star className="w-3 h-3 fill-current" />}>
              {t("card.featured")}
            </Badge>
          </div>
        )}

        {/* Profile info row */}
        <div className="flex items-start gap-3.5 mb-4">
          {/* Avatar (52px) */}
          {effectiveAvatar ? (
            <img
              src={effectiveAvatar}
              alt={effectiveName}
              className="w-13 h-13 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-13 h-13 rounded-full bg-bg-subtle border border-border flex items-center justify-center font-display font-bold text-navy text-lg select-none">
              {effectiveInitials}
            </div>
          )}

          {/* Name & Uni */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-display font-bold text-base text-fg truncate">
                {effectiveSlug ? (
                  // Stretched link: the whole card is the click target, one link for screen readers
                  <Link
                    to={`/tutors/${effectiveSlug}`}
                    className="after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-orange"
                  >
                    {effectiveName}
                  </Link>
                ) : (
                  effectiveName
                )}
              </h3>
              {effectiveVerified && (
                <span title={t("card.verifiedTitle")} className="inline-flex">
                  <CheckCircle className="w-4 h-4 text-info shrink-0" aria-hidden />
                  <span className="sr-only">{t("card.verifiedTitle")}</span>
                </span>
              )}
            </div>

            {/* Subjects highlighted with orange-text token (hidden for fellow tutors) */}
            {!isPeerTutor && effectiveSubjects.length > 0 && (
              <p className="text-sm font-semibold text-orange-text truncate mt-0.5">
                {effectiveSubjects.map((subject) => labelOf(subject, lang)).join(", ")}
              </p>
            )}

            {/* University & Area (just university for fellow tutors) */}
            {placeLine.length > 0 && (
              <p className="text-xs text-fg-muted mt-0.5 truncate">
                {placeLine.map((part, index) => (
                  <span key={part}>
                    {index > 0 && " · "}
                    {index === placeLine.length - 1 && placeLine.length > 1 ? (
                      <span className="text-fg-secondary font-medium">{part}</span>
                    ) : (
                      part
                    )}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        {/* Regular visitors see rating, classes and fee range; fellow tutors only see name and uni */}
        {!isPeerTutor && (
          <>
            {/* Divider */}
            <div className="h-px bg-border-light my-3" />

            {/* Rating and Class tag row */}
            <div className="flex items-center justify-between text-xs mb-4">
              {effectiveReviews > 0 ? (
                <div className="flex items-center gap-1.5 font-display font-bold text-fg tabular-nums">
                  <Star className="w-4 h-4 text-star fill-star" aria-hidden />
                  <span>{Number(effectiveRating).toFixed(1)}</span>
                  <span className="text-fg-muted font-normal">({effectiveReviews})</span>
                </div>
              ) : (
                <Badge variant="free">{t("card.new")}</Badge>
              )}

              <div className="flex gap-1 flex-wrap justify-end">
                {effectiveClasses.slice(0, 2).map((c) => (
                  <Badge key={c.slug} variant="tag" className="text-[11px] py-0">
                    {labelOf(c, lang)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Fee range */}
            {effectiveFeeMin != null && effectiveFeeMax != null && (
              <div className="text-xs text-fg-muted mb-4">
                {t("card.salary")}:{" "}
                <span className="font-display font-bold text-sm text-fg tabular-nums">
                  ৳{effectiveFeeMin.toLocaleString("en-IN")}–{effectiveFeeMax.toLocaleString("en-IN")}
                </span>
                <span className="text-fg-muted">{t("card.perMonth")}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Button */}
      {/* Looks like a button; the stretched link above is what is actually clicked */}
      <span
        aria-hidden
        className="inline-flex items-center justify-center gap-2 w-full min-h-11 px-6 rounded-md border border-border bg-bg-card/60 text-fg font-display font-semibold text-sm transition-all duration-300 group-hover:border-orange group-hover:bg-orange-pale group-hover:text-orange-text"
      >
        {t("card.viewProfile")}
        <ArrowRight
          className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden
        />
      </span>
    </div>
  );
}
