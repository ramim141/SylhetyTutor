import { useTranslation } from "../../../i18n";
import { toOptions } from "../../../utils/lookups";
import { Input } from "../../ui/Input";
import { SelectField } from "../../ui/SelectField";
import { YEAR_VALUES } from "./steps";

export function StepStudies({ draft, update, errors, lookups }) {
  const { t, lang } = useTranslation();
  const years = YEAR_VALUES.map((value, index) => ({ value, label: t(`tr.year.${index + 1}`) }));

  return (
    <div className="flex flex-col gap-4">
      <SelectField
        label={t("tr.university")}
        value={draft.university}
        onChange={(university) => update({ university })}
        options={toOptions(lookups.universities, lang)}
        error={errors.university}
      />
      <Input
        label={t("tr.department")}
        value={draft.department}
        onChange={(e) => update({ department: e.target.value })}
        error={errors.department}
        maxLength={150}
        autoComplete="off"
      />
      <SelectField
        label={t("tr.year")}
        value={draft.year}
        onChange={(year) => update({ year })}
        options={years}
        error={errors.year}
      />
      <Input
        label={t("tr.studentId")}
        value={draft.student_id_number}
        onChange={(e) => update({ student_id_number: e.target.value })}
        error={errors.studentId}
        maxLength={50}
        autoComplete="off"
      />
    </div>
  );
}

export default StepStudies;
