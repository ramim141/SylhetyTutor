import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { useTranslation } from "../../../i18n";
import { authApi } from "../../../api/auth";
import { getFormError } from "../../../api/errors";
import { useAuthStore } from "../../../store/authStore";
import { useImageUpload } from "../../../hooks/useImageUpload";
import { ACCEPT_ATTRIBUTE } from "../../../utils/imageFile";
import { Alert } from "../../ui/Alert";
import { Button } from "../../ui/Button";
import { UploadProgress } from "../../ui/UploadProgress";

/**
 * The profile photo. It is stored on imgBB, a public host, and shown on the public page:
 * a photo of the tutor's face, never an identity document (the hint says so).
 */
export function AvatarUpload() {
  const i18n = useTranslation();
  const { t } = i18n;
  const inputRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const { progress, uploading, error, setError, pick } = useImageUpload(authApi.uploadAvatar);

  const setUser = (updated) => useAuthStore.setState({ user: updated });

  const handleChange = async (event) => {
    setRemoveError("");
    const updated = await pick(event);
    if (updated) setUser(updated);
  };

  const handleRemove = async () => {
    setError("");
    setRemoveError("");
    setRemoving(true);
    try {
      setUser(await authApi.deleteAvatar());
    } catch (err) {
      setRemoveError(getFormError(err, i18n) || t("error.generic"));
    } finally {
      setRemoving(false);
    }
  };

  const busy = uploading || removing;
  const message = error || removeError;
  const hasPhoto = Boolean(user?.avatar);
  const initial = user?.full_name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="rounded-lg border border-border bg-bg-card p-4 flex flex-col gap-3">
      <div>
        <h3 className="font-display font-bold text-base">{t("tr.photo.title")}</h3>
        <p className="text-xs text-fg-muted mt-0.5">{t("tr.photo.hint")}</p>
      </div>

      <div className="flex items-center gap-4">
        {hasPhoto ? (
          <img
            src={user.avatar}
            alt={t("tr.photo.alt")}
            className="w-20 h-20 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div
            aria-hidden
            className="w-20 h-20 rounded-full bg-orange-light text-orange-text font-display font-extrabold text-3xl flex items-center justify-center shrink-0"
          >
            {initial}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            tabIndex={-1}
            onChange={handleChange}
            disabled={busy}
            aria-label={t("tr.photo.title")}
          />
          <Button
            type="button"
            variant={hasPhoto ? "outline" : "primary"}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="w-4 h-4" aria-hidden />
            {hasPhoto ? t("tr.photo.change") : t("tr.photo.choose")}
          </Button>
          {hasPhoto && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              loading={removing}
              onClick={handleRemove}
            >
              <Trash2 className="w-4 h-4" aria-hidden />
              {t("tr.photo.remove")}
            </Button>
          )}
        </div>
      </div>

      {uploading && <UploadProgress percent={progress} />}
      {message && <Alert variant="error">{message}</Alert>}
      <p className="text-xs text-fg-secondary">{t("tr.photo.public")}</p>
    </div>
  );
}

export default AvatarUpload;
