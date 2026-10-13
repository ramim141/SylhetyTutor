import { CheckCircle, TriangleAlert } from "lucide-react";
import { useTranslation } from "../../../i18n";
import { findBySlug, labelOf } from "../../../utils/lookups";
import { Button } from "../../ui/Button";
import { YEAR_VALUES, stepOfField, yearKey } from "./steps";

const money = (n) => `৳${Number(n).toLocaleString("en-IN")}`;

function Row({ label, children, step, onEdit }) {
  const { t } = useTranslation();
  return (
    <div className="py-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-display font-bold text-fg-secondary">{label}</p>
        <div className="text-sm text-fg break-words">
          {children || <span className="text-fg-muted">{t("tr.review.empty")}</span>}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 min-h-11"
        onClick={() => onEdit(step)}
      >
        {t("tr.review.edit")}
      </Button>
    </div>
  );
}

/** Everything in one place before the tutor sends it, with a way back to each step. */
export function StepReview({ profile, draft, lookups, onEdit }) {
  const { t, lang } = useTranslation();
  const missing = profile.missing;
  const names = (list, slugs) =>
    slugs.map((slug) => labelOf(findBySlug(list, slug), lang) || slug).join(", ");
  const year = YEAR_VALUES.includes(draft.year) ? t(yearKey(draft.year)) : draft.year;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg-secondary">{t("tr.review.hint")}</p>

      {missing.length > 0 ? (
        <section
          aria-labelledby="missing-heading"
          className="rounded-lg border border-warning/40 bg-warning-bg p-4"
        >
          <h3
            id="missing-heading"
            className="flex items-center gap-2 text-sm font-display font-bold text-warning"
          >
            <TriangleAlert className="w-4 h-4" aria-hidden />
            {t("tr.review.missing")}
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {missing.map((field) => (
              <li key={field} className="flex items-center justify-between gap-3">
                <span className="text-sm text-fg">{t(`tr.field.${field}`)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11"
                  onClick={() => onEdit(stepOfField(field))}
                >
                  {t("tr.review.fix")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-success/40 bg-success-bg p-4 text-sm font-display font-semibold text-success">
          <CheckCircle className="w-5 h-5 shrink-0" aria-hidden />
          {t("tr.review.ready")}
        </p>
      )}

      <div className="divide-y divide-border-light rounded-lg border border-border bg-bg-card px-4">
        <Row label={t("tr.field.gender")} step={1} onEdit={onEdit}>
          {draft.gender && t(`search.gender.${draft.gender}`)}
        </Row>
        <Row label={t("tr.review.docs")} step={2} onEdit={onEdit}>
          {profile.documents.nid && profile.documents.student_id && t("tr.doc.uploaded")}
        </Row>
        <Row label={t("tr.field.university")} step={3} onEdit={onEdit}>
          {draft.university && labelOf(findBySlug(lookups.universities, draft.university), lang)}
        </Row>
        <Row label={t("tr.field.department")} step={3} onEdit={onEdit}>
          {draft.department}
        </Row>
        <Row label={t("tr.field.year")} step={3} onEdit={onEdit}>
          {year}
        </Row>
        <Row label={t("tr.field.student_id_number")} step={3} onEdit={onEdit}>
          {draft.student_id_number}
        </Row>
        <Row label={t("tr.field.subjects")} step={4} onEdit={onEdit}>
          {names(lookups.subjects, draft.subjects)}
        </Row>
        <Row label={t("tr.field.class_levels")} step={4} onEdit={onEdit}>
          {names(lookups.class_levels, draft.class_levels)}
        </Row>
        <Row label={t("tr.field.areas")} step={5} onEdit={onEdit}>
          {names(lookups.areas, draft.areas)}
        </Row>
        <Row label={t("tr.field.availability")} step={5} onEdit={onEdit}>
          {draft.availability.length > 0 && t("tr.review.slots", { n: draft.availability.length })}
        </Row>
        <Row label={t("tr.fee.label")} step={6} onEdit={onEdit}>
          {draft.fee_min && draft.fee_max && `${money(draft.fee_min)}–${money(draft.fee_max)}`}
        </Row>
        <Row label={t("tr.field.bio")} step={6} onEdit={onEdit}>
          {draft.bio}
        </Row>
      </div>
    </div>
  );
}

export default StepReview;
