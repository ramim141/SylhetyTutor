import { X } from "lucide-react";
import { useTranslation } from "../../i18n";
import { findBySlug, labelOf } from "../../utils/lookups";

const money = (amount) => `৳${amount.toLocaleString("en-IN")}`;

/** One removable chip per applied filter, named in the current language. */
export function ActiveFilterChips({ filters, lookups, onRemove }) {
  const { t, lang } = useTranslation();

  const chips = [];
  const add = (keys, label) => chips.push({ keys, label });
  const named = (key, list, labelKey) => {
    if (!filters[key]) return;
    const name = labelOf(findBySlug(lookups[list], filters[key]), lang) || filters[key];
    add([key], `${t(labelKey)}: ${name}`);
  };

  named("area", "areas", "search.filter.area");
  named("subject", "subjects", "search.filter.subject");
  named("class_level", "class_levels", "search.filter.class");
  named("university", "universities", "search.filter.university");
  if (filters.gender) {
    add(["gender"], `${t("search.filter.gender")}: ${t(`search.gender.${filters.gender}`)}`);
  }
  const { fee_min: min, fee_max: max } = filters;
  if (min !== undefined || max !== undefined) {
    const label =
      min !== undefined && max !== undefined
        ? t("search.fee.range", { min: money(min), max: money(max) })
        : min !== undefined
          ? t("search.fee.from", { min: money(min) })
          : t("search.fee.upTo", { max: money(max) });
    add(["fee_min", "fee_max"], label);
  }

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2" aria-label={t("search.filters")}>
      {chips.map(({ keys, label }) => (
        <li key={keys.join()}>
          <button
            type="button"
            onClick={() => onRemove(keys)}
            aria-label={t("search.removeFilter", { name: label })}
            className="inline-flex items-center gap-1.5 min-h-11 pl-3.5 pr-3 rounded-full border border-navy bg-navy text-on-navy text-sm font-display font-semibold cursor-pointer active:scale-95 transition"
          >
            {label}
            <X className="w-4 h-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default ActiveFilterChips;
