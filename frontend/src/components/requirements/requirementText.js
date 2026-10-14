import { labelOf } from "../../utils/lookups";

/** "৳3,000–5,000" style numbers in the reader's language. */
function formatNumber(value, lang) {
  return new Intl.NumberFormat(lang === "en" ? "en-IN" : "bn-BD").format(value);
}

/** One-line budget text; "not set" when the guardian left it empty. */
export function budgetText(requirement, { t, lang }) {
  const { budget_min: min, budget_max: max } = requirement;
  if (min != null && max != null) {
    return t("req.budget.range", { min: formatNumber(min, lang), max: formatNumber(max, lang) });
  }
  if (max != null) return t("req.budget.upTo", { max: formatNumber(max, lang) });
  if (min != null) return t("req.budget.from", { min: formatNumber(min, lang) });
  return t("req.budget.none");
}

/** "HSC · Math, Physics" */
export function headline(requirement, lang, fallback) {
  const level = labelOf(requirement.class_level, lang);
  const subjects = (requirement.subjects || []).map((s) => labelOf(s, lang)).join(", ");
  return [level, subjects].filter(Boolean).join(" · ") || fallback;
}
