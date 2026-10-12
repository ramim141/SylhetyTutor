import { useTranslation } from "../../../i18n";
import { toOptions } from "../../../utils/lookups";
import { ChipSelect } from "../../ui/ChipSelect";

export function StepTeaching({ draft, update, errors, lookups }) {
  const { t, lang } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <ChipSelect
        label={t("tr.subjects.label")}
        hint={t("tr.pickAll")}
        options={toOptions(lookups.subjects, lang)}
        value={draft.subjects}
        onChange={(subjects) => update({ subjects })}
        error={errors.subjects}
      />
      <ChipSelect
        label={t("tr.classes.label")}
        hint={t("tr.pickAll")}
        options={toOptions(lookups.class_levels, lang)}
        value={draft.class_levels}
        onChange={(class_levels) => update({ class_levels })}
        error={errors.classLevels}
      />
    </div>
  );
}

export default StepTeaching;
