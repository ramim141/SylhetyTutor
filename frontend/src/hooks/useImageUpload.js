import { useCallback, useState } from "react";
import { useTranslation } from "../i18n";
import { getFieldErrors, getFormError } from "../api/errors";
import { imageFileProblem } from "../utils/imageFile";

/**
 * Shared by every "choose a photo" control. `upload(file, { onProgress })` does the request;
 * `pick(event)` is for the file input's onChange. A wrong file (type, size) is refused at
 * once; server errors become a message in the current language (file errors first, then
 * network / throttling / "uploads unavailable").
 */
export function useImageUpload(upload) {
  const i18n = useTranslation();
  const { t } = i18n;
  const [progress, setProgress] = useState(null); // null = idle, else 0..100
  const [error, setError] = useState("");

  const pick = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = ""; // choosing the same file again must still fire onChange
      if (!file) return null;

      const problem = imageFileProblem(file);
      if (problem) {
        setError(t(`error.file.${problem}`));
        return null;
      }

      setError("");
      setProgress(0);
      try {
        return await upload(file, { onProgress: setProgress });
      } catch (err) {
        setError(getFieldErrors(err, i18n).file || getFormError(err, i18n) || t("error.generic"));
        return null;
      } finally {
        setProgress(null);
      }
    },
    // i18n is a new object every render; its language is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upload, t],
  );

  return { progress, uploading: progress !== null, error, setError, pick };
}
