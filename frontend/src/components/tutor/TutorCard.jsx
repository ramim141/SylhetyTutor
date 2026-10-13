import { Star, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { useTranslation } from "../../i18n";

export function TutorCard({
  slug,
  name,
  initials,
  avatarUrl,
  university,
  area,
  subjects = [],
  classes = [],
  rating = 0,
  reviewCount = 0,
  feeMin = null,
  feeMax = null,
  isFeatured = false,
  isVerified = true,
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`group relative rounded-lg p-5 shadow-card hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
        isFeatured
          ? "border-2 border-featured-border bg-featured-bg"
          : "border border-border bg-bg-card"
      }`}
    >
      <div>
        {/* Top Header: Featured Badge */}
        {isFeatured && (
          <div className="mb-3">
            <Badge variant="featured" icon={<Star className="w-3 h-3 fill-current" />}>
              {t("card.featured")}
            </Badge>
          </div>
        )}

        {/* Profile info row */}
        <div className="flex items-start gap-3.5 mb-4">
          {/* Avatar (52px) */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-13 h-13 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-13 h-13 rounded-full bg-bg-subtle border border-border flex items-center justify-center font-display font-bold text-navy text-lg select-none">
              {initials}
            </div>
          )}

          {/* Name & Uni */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-display font-bold text-base text-fg truncate">
                {slug ? (
                  // Stretched link: the whole card is the click target, one link for screen readers
                  <Link
                    to={`/tutors/${slug}`}
                    className="after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-orange"
                  >
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </h3>
              {isVerified && (
                <span title={t("card.verifiedTitle")} className="inline-flex">
                  <CheckCircle className="w-4 h-4 text-info shrink-0" aria-hidden />
                  <span className="sr-only">{t("card.verifiedTitle")}</span>
                </span>
              )}
            </div>

            {/* Subjects highlighted with orange-text token */}
            <p className="text-sm font-semibold text-orange-text truncate mt-0.5">
              {subjects.join(", ")}
            </p>

            {/* University & Area */}
            <p className="text-xs text-fg-muted mt-0.5 truncate">
              {university} · <span className="text-fg-secondary font-medium">{area}</span>
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-light my-3" />

        {/* Rating and Class tag row */}
        <div className="flex items-center justify-between text-xs mb-4">
          {reviewCount > 0 ? (
            <div className="flex items-center gap-1.5 font-display font-bold text-fg tabular-nums">
              <Star className="w-4 h-4 text-star fill-star" aria-hidden />
              <span>{Number(rating).toFixed(1)}</span>
              <span className="text-fg-muted font-normal">({reviewCount})</span>
            </div>
          ) : (
            // No reviews yet: say so honestly instead of showing 0.0 or a made-up rating
            <Badge variant="free">{t("card.new")}</Badge>
          )}

          <div className="flex gap-1 flex-wrap justify-end">
            {classes.slice(0, 2).map((c) => (
              <Badge key={c} variant="tag" className="text-[11px] py-0">
                {c}
              </Badge>
            ))}
          </div>
        </div>

        {/* Fee range (an incomplete profile may not have one yet: show nothing, never ৳0) */}
        {feeMin != null && feeMax != null && (
          <div className="text-xs text-fg-muted mb-4">
            {t("card.salary")}:{" "}
            <span className="font-display font-bold text-sm text-fg tabular-nums">
              ৳{feeMin.toLocaleString("en-IN")}–{feeMax.toLocaleString("en-IN")}
            </span>
            <span className="text-fg-muted">{t("card.perMonth")}</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      {/* Looks like a button; the stretched link above is what is actually clicked */}
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-full min-h-11 px-6 rounded-md border-2 border-orange text-orange-text font-display font-semibold text-sm transition-colors group-hover:bg-orange-pale"
      >
        {t("card.viewProfile")}
      </span>
    </div>
  );
}
