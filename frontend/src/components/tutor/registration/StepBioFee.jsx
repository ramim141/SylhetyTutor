import { useId } from "react";
import { useTranslation } from "../../../i18n";
import { Input } from "../../ui/Input";
import { BIO_MAX } from "./steps";

const digits = (value) => value.replace(/\D/g, "").slice(0, 7);

export function StepBioFee({ draft, update, errors }) {
  const { t } = useTranslation();
  const bioId = useId();
  const bioError = errors.bio;

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="text-sm font-display font-bold mb-2">{t("tr.fee.label")}</legend>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("tr.fee.min")}
            value={draft.fee_min}
            onChange={(e) => update({ fee_min: digits(e.target.value) })}
            error={errors.feeMin}
            inputMode="numeric"
            autoComplete="off"
          />
          <Input
            label={t("tr.fee.max")}
            value={draft.fee_max}
            onChange={(e) => update({ fee_max: digits(e.target.value) })}
            error={errors.feeMax}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor={bioId} className="block text-sm font-display font-bold">
          {t("tr.bio.label")}
        </label>
        <p className="text-xs text-fg-muted mb-2">{t("tr.bio.hint")}</p>
        <textarea
          id={bioId}
          value={draft.bio}
          onChange={(e) => update({ bio: e.target.value })}
          rows={5}
          maxLength={BIO_MAX}
          aria-invalid={bioError ? true : undefined}
          className={`w-full px-3.5 py-2.5 rounded-xl text-base font-body bg-bg-card text-fg border focus:ring-3 focus:outline-hidden ${
            bioError
              ? "border-error focus:border-error focus:ring-error/15"
              : "border-border hover:border-fg-muted/40 focus:border-orange focus:ring-orange/15"
          }`}
        />
        <div className="flex justify-between gap-3 mt-1">
          <p role="alert" className="text-xs font-display font-medium text-error">
            {bioError}
          </p>
          <p className="text-xs text-fg-muted tabular-nums ml-auto">
            {t("tr.bio.count", { n: draft.bio.length })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default StepBioFee;
