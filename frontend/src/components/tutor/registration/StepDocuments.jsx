import { Lock } from "lucide-react";
import { useTranslation } from "../../../i18n";
import { DocumentUpload } from "./DocumentUpload";

export function StepDocuments({ profile, onProfile, errors }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 text-sm text-fg-secondary">
        <Lock className="w-4 h-4 mt-0.5 shrink-0 text-fg-muted" aria-hidden />
        {t("tr.doc.private")}
      </p>
      <p className="text-xs text-fg-muted">{t("tr.doc.hint")}</p>

      {["nid", "student_id"].map((kind) => (
        <div key={kind} className="flex flex-col gap-1.5">
          <DocumentUpload kind={kind} profile={profile} onProfile={onProfile} />
          {errors[kind] && (
            <p role="alert" className="text-xs font-display font-medium text-error">
              {errors[kind]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default StepDocuments;
