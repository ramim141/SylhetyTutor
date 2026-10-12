import { Check } from "lucide-react";

/**
 * Pick any number of options (subjects, classes, areas). A selected option shows a tick as
 * well as a colour, so it never depends on colour alone (DESIGN.md 2.5).
 */
export function ChipSelect({ label, hint, options, value, onChange, error, disabled = false }) {
  const toggle = (option) =>
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="block text-sm font-display font-bold text-fg mb-1">{label}</legend>
      {hint && <p className="text-xs text-fg-muted mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option.value)}
              className={`inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full border text-sm font-medium cursor-pointer active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "bg-navy text-on-navy border-navy font-semibold"
                  : "bg-bg-card text-fg border-border hover:bg-orange-light hover:text-orange-text"
              }`}
            >
              {selected && <Check className="w-4 h-4" aria-hidden />}
              {option.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-display font-medium text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export default ChipSelect;
