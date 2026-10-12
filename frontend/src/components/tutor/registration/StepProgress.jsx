import { useTranslation } from "../../../i18n";

/** "Step 3 of 6" with a bar, so a tutor on a phone knows how far along they are. */
export function StepProgress({ step, total, title }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-display font-semibold text-fg-secondary tabular-nums">
          {t("tr.stepOf", { n: step, total })}
        </p>
        <h2 className="text-base font-display font-bold text-fg text-right">{title}</h2>
      </div>
      <div
        role="progressbar"
        aria-label={t("tr.progress")}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-valuetext={t("tr.stepOf", { n: step, total })}
        className="h-2 rounded-full bg-bg-subtle border border-border overflow-hidden"
      >
        <div
          className="h-full bg-orange transition-[width] duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default StepProgress;
