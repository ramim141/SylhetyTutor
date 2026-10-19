import { useState } from "react";
import { Star, X } from "lucide-react";
import { createTutorReview } from "../../api/reviews";
import { getFormError } from "../../api/errors";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { useTranslation } from "../../i18n";

export function ReviewDialog({ isOpen, onClose, tutorId, onReviewSubmitted }) {
  const { t, i18n } = useTranslation();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const newReview = await createTutorReview({
        tutor_id: tutorId,
        rating,
        comment: comment.trim(),
      });
      onReviewSubmitted(newReview);
      onClose();
    } catch (err) {
      setError(getFormError(err, i18n) || t("error.no_confirmed_match"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-fg">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="review-dialog-title" className="text-xl font-display font-bold mb-1">
          {t("reviews.writeReview")}
        </h2>
        <p className="text-xs md:text-sm text-fg-secondary mb-5">
          {t("reviews.commentPlaceholder")}
        </p>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star selector */}
          <div>
            <label className="block text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-2">
              {t("reviews.ratingLabel")}
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-2xl transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${star} stars`}
                >
                  <Star
                    className={`w-7 h-7 ${
                      (hoverRating || rating) >= star
                        ? "text-star fill-star"
                        : "text-border fill-transparent"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-display font-bold text-base text-fg tabular-nums">
                {hoverRating || rating} / 5
              </span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="review-comment"
              className="block text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-2"
            >
              {t("reviews.commentLabel")}
            </label>
            <textarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("reviews.commentPlaceholder")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-orange text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("reviews.submitting") : t("reviews.submit")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
