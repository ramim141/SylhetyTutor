import { useTranslation } from "../../../i18n";
import { toOptions } from "../../../utils/lookups";
import { AvailabilityGrid } from "../AvailabilityGrid";
import { ChipSelect } from "../../ui/ChipSelect";

export function StepWhere({ draft, update, errors, lookups }) {
  const { t, lang } = useTranslation();

  const toggle = (day, slot) => {
    const taken = draft.availability.some((entry) => entry.day === day && entry.slot === slot);
    update({
      availability: taken
        ? draft.availability.filter((entry) => !(entry.day === day && entry.slot === slot))
        : [...draft.availability, { day, slot }],
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <ChipSelect
        label={t("tr.areas.label")}
        hint={t("tr.pickAll")}
        options={toOptions(lookups.areas, lang)}
        value={draft.areas}
        onChange={(areas) => update({ areas })}
        error={errors.areas}
      />

      <div>
        <p className="text-sm font-display font-bold">{t("tr.availability.label")}</p>
        <p className="text-xs text-fg-muted mb-2">{t("tr.availability.hint")}</p>
        <AvailabilityGrid availability={draft.availability} onToggle={toggle} />
        {errors.availability && (
          <p role="alert" className="mt-1 text-xs font-display font-medium text-error">
            {errors.availability}
          </p>
        )}
      </div>
    </div>
  );
}

export default StepWhere;
