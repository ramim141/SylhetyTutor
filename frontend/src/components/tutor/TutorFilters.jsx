import { useId, useState } from "react";
import { useTranslation } from "../../i18n";
import { GENDERS } from "../../utils/searchParams";
import { labelOf } from "../../utils/lookups";
import { Input } from "../ui/Input";

function FilterSelect({ id, label, value, onChange, children }) {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-display font-bold text-fg mb-1 select-none">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-11 px-3.5 rounded-xl text-base font-body bg-bg-card text-fg border border-border hover:border-fg-muted/40 focus:border-orange focus:ring-3 focus:ring-orange/15 focus:outline-hidden cursor-pointer"
      >
        <option value="">{t("search.any")}</option>
        {children}
      </select>
    </div>
  );
}

const digitsOnly = (value) => value.replace(/\D/g, "").slice(0, 7);

/**
 * The filter fields. Controlled: `values` in, `onChange(patch)` out.
 * Selects apply at once. The budget boxes apply when the user leaves them (so a request
 * isn't sent per digit) unless `liveFee` is set, which the mobile sheet uses because its
 * values only count once "Show tutors" is pressed.
 */
export function TutorFilters({ values, lookups, onChange, liveFee = false }) {
  const { t, lang } = useTranslation();
  const uid = useId();
  const [feeMin, setFeeMin] = useState(values.fee_min?.toString() ?? "");
  const [feeMax, setFeeMax] = useState(values.fee_max?.toString() ?? "");
  const [feeError, setFeeError] = useState("");

  // The URL changed (Back, a chip was removed, filters cleared): show it in the boxes.
  // Adjusting state while rendering is React's way to follow a prop without an effect.
  const [seen, setSeen] = useState({ min: values.fee_min, max: values.fee_max });
  if (seen.min !== values.fee_min || seen.max !== values.fee_max) {
    setSeen({ min: values.fee_min, max: values.fee_max });
    setFeeMin(values.fee_min?.toString() ?? "");
    setFeeMax(values.fee_max?.toString() ?? "");
    setFeeError("");
  }

  const commitFee = (min, max) => {
    if (min !== "" && max !== "" && Number(min) > Number(max)) {
      setFeeError(t("search.feeError"));
      return;
    }
    setFeeError("");
    onChange({ fee_min: min === "" ? "" : Number(min), fee_max: max === "" ? "" : Number(max) });
  };

  const feeInput = (key, value, setValue) => ({
    value,
    inputMode: "numeric",
    autoComplete: "off",
    onChange: (e) => {
      const next = digitsOnly(e.target.value);
      setValue(next);
      if (liveFee) commitFee(...(key === "min" ? [next, feeMax] : [feeMin, next]));
    },
    onBlur: () => !liveFee && commitFee(feeMin, feeMax),
    onKeyDown: (e) => e.key === "Enter" && !liveFee && commitFee(feeMin, feeMax),
  });

  const options = (list) =>
    list.map((item) => (
      <option key={item.slug} value={item.slug}>
        {labelOf(item, lang)}
      </option>
    ));

  return (
    <div className="flex flex-col gap-4">
      <FilterSelect
        id={`${uid}-area`}
        label={t("search.filter.area")}
        value={values.area}
        onChange={(area) => onChange({ area })}
      >
        {options(lookups.areas)}
      </FilterSelect>

      <FilterSelect
        id={`${uid}-subject`}
        label={t("search.filter.subject")}
        value={values.subject}
        onChange={(subject) => onChange({ subject })}
      >
        {options(lookups.subjects)}
      </FilterSelect>

      <FilterSelect
        id={`${uid}-class`}
        label={t("search.filter.class")}
        value={values.class_level}
        onChange={(class_level) => onChange({ class_level })}
      >
        {options(lookups.class_levels)}
      </FilterSelect>

      <FilterSelect
        id={`${uid}-university`}
        label={t("search.filter.university")}
        value={values.university}
        onChange={(university) => onChange({ university })}
      >
        {options(lookups.universities)}
      </FilterSelect>

      <FilterSelect
        id={`${uid}-gender`}
        label={t("search.filter.gender")}
        value={values.gender}
        onChange={(gender) => onChange({ gender })}
      >
        {GENDERS.map((gender) => (
          <option key={gender} value={gender}>
            {t(`search.gender.${gender}`)}
          </option>
        ))}
      </FilterSelect>

      <fieldset className="min-w-0">
        <legend className="block text-xs font-display font-bold text-fg mb-1 select-none">
          {t("search.filter.fee")}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <Input
            aria-label={t("search.feeMin")}
            placeholder={t("search.feeMin")}
            aria-invalid={feeError ? true : undefined}
            {...feeInput("min", feeMin, setFeeMin)}
          />
          <Input
            aria-label={t("search.feeMax")}
            placeholder={t("search.feeMax")}
            aria-invalid={feeError ? true : undefined}
            {...feeInput("max", feeMax, setFeeMax)}
          />
        </div>
        {feeError && (
          <p role="alert" className="mt-1.5 text-xs font-display font-medium text-error">
            {feeError}
          </p>
        )}
      </fieldset>
    </div>
  );
}

export default TutorFilters;
