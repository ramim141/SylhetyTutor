import { User } from "lucide-react";
import { useTranslation } from "../../../i18n";
import { useAuthStore } from "../../../store/authStore";
import { AvatarUpload } from "./AvatarUpload";

const GENDERS = ["male", "female"];

export function StepAbout({ draft, update, errors }) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg bg-bg-subtle border border-border-light p-4 flex items-start gap-3">
        <User className="w-5 h-5 text-fg-muted shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-display font-bold text-fg-secondary">{t("tr.account")}</p>
          <p className="font-display font-bold truncate">{user?.full_name}</p>
          <p className="text-sm text-fg-secondary tabular-nums">{user?.phone || user?.email}</p>
          <p className="text-xs text-fg-muted mt-1">{t("tr.accountHint")}</p>
        </div>
      </div>

      <div role="radiogroup" aria-label={t("tr.gender.label")}>
        <p className="text-sm font-display font-bold mb-2">{t("tr.gender.label")}</p>
        <div className="grid grid-cols-2 gap-3">
          {GENDERS.map((gender) => {
            const selected = draft.gender === gender;
            return (
              <button
                key={gender}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ gender })}
                className={`min-h-14 rounded-lg border-2 font-display font-semibold cursor-pointer transition ${
                  selected
                    ? "border-orange bg-orange-light text-orange-text"
                    : "border-border bg-bg-card text-fg hover:border-orange/60"
                }`}
              >
                {t(`search.gender.${gender}`)}
              </button>
            );
          })}
        </div>
        {errors.gender && (
          <p role="alert" className="mt-2 text-xs font-display font-medium text-error">
            {errors.gender}
          </p>
        )}
      </div>

      <AvatarUpload />
    </div>
  );
}

export default StepAbout;
