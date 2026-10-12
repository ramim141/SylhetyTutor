import { useId } from "react";
import { useTranslation } from "../../i18n";

/** A labelled native select (best on phones) with an error line, like <Input>. */
export function SelectField({ label, value, onChange, options, error, disabled = false }) {
  const { t } = useTranslation();
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-xs font-display font-bold text-fg mb-1 select-none">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full min-h-11 px-3.5 rounded-xl text-base font-body bg-bg-card text-fg border focus:ring-3 focus:outline-hidden cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          error
            ? "border-error focus:border-error focus:ring-error/15"
            : "border-border hover:border-fg-muted/40 focus:border-orange focus:ring-orange/15"
        }`}
      >
        <option value="">{t("tr.choose")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-display font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default SelectField;
