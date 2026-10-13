import { useTranslation } from "../../i18n";

export function UploadProgress({ percent }) {
  const { t } = useTranslation();
  const text = t("tr.doc.uploading", { percent });
  return (
    <div className="flex flex-col gap-1.5" role="status">
      <div
        role="progressbar"
        aria-label={text}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 rounded-full bg-bg-subtle border border-border overflow-hidden"
      >
        <div className="h-full bg-orange transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-fg-secondary tabular-nums">{text}</p>
    </div>
  );
}

export default UploadProgress;
