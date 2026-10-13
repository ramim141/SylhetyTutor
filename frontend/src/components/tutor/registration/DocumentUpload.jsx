import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle, FileImage, Trash2, Upload } from "lucide-react";
import { useTranslation } from "../../../i18n";
import { deleteDocument, getDocumentBlob, uploadDocument } from "../../../api/tutors";
import { getFieldErrors, getFormError } from "../../../api/errors";
import { useImageUpload } from "../../../hooks/useImageUpload";
import { ACCEPT_ATTRIBUTE } from "../../../utils/imageFile";
import { Alert } from "../../ui/Alert";
import { Button } from "../../ui/Button";
import { UploadProgress } from "../../ui/UploadProgress";

/**
 * One identity document (`kind` = "nid" or "student_id"). The file sits behind a login, so
 * the preview is fetched with the token and shown as an object URL; it never has a public
 * address. `onProfile` receives my updated profile after an upload or removal.
 */
export function DocumentUpload({ kind, profile, onProfile, disabled = false }) {
  const i18n = useTranslation();
  const { t } = i18n;
  const inputId = useId();
  const inputRef = useRef(null);
  const label = t(`tr.doc.${kind}`);
  const uploaded = Boolean(profile.documents?.[kind]);

  const [version, setVersion] = useState(0); // changes when the file is replaced
  const [preview, setPreview] = useState({ version: -1, url: null, failed: false });
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);

  const { progress, uploading, error, setError, pick } = useImageUpload((file, options) =>
    uploadDocument(kind, file, options),
  );

  useEffect(() => {
    if (!uploaded) return undefined;
    const controller = new AbortController();
    let objectUrl = null;
    getDocumentBlob(profile.id, kind, { signal: controller.signal })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPreview({ version, url: objectUrl, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setPreview({ version, url: null, failed: true });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uploaded, profile.id, kind, version]);

  const current = preview.version === version;
  const previewUrl = uploaded && current ? preview.url : null;
  const previewFailed = uploaded && current && preview.failed;

  const handleChange = async (event) => {
    setRemoveError("");
    const updated = await pick(event);
    if (updated) {
      setVersion((v) => v + 1);
      onProfile(updated);
    }
  };

  const handleRemove = async () => {
    setError("");
    setRemoveError("");
    setRemoving(true);
    try {
      onProfile(await deleteDocument(kind));
    } catch (err) {
      setRemoveError(
        getFieldErrors(err, i18n).file || getFormError(err, i18n) || t("error.generic"),
      );
    } finally {
      setRemoving(false);
    }
  };

  const busy = uploading || removing || disabled;
  const message = error || removeError;

  return (
    <div className="rounded-lg border border-border bg-bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-base">{label}</h3>
          <p
            className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-display font-semibold ${
              uploaded ? "text-success" : "text-fg-muted"
            }`}
          >
            {uploaded && <CheckCircle className="w-4 h-4" aria-hidden />}
            {uploaded ? t("tr.doc.uploaded") : t("tr.doc.missing")}
          </p>
        </div>
      </div>

      {uploaded && (
        <div className="rounded-md bg-bg-subtle border border-border-light overflow-hidden flex items-center justify-center min-h-32">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={t("tr.doc.preview", { label })}
              className="max-h-56 w-full object-contain"
            />
          ) : (
            <p className="flex items-center gap-2 text-xs text-fg-muted p-4 text-center">
              <FileImage className="w-5 h-5 shrink-0" aria-hidden />
              {previewFailed ? t("tr.doc.previewFailed") : t("common.loading")}
            </p>
          )}
        </div>
      )}

      {uploading && <UploadProgress percent={progress} />}

      {message && <Alert variant="error">{message}</Alert>}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        onChange={handleChange}
        disabled={busy}
        aria-label={label}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={uploaded ? "outline" : "primary"}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-4 h-4" aria-hidden />
          {uploaded ? t("tr.doc.replace") : t("tr.doc.choose")}
        </Button>
        {uploaded && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            loading={removing}
            onClick={handleRemove}
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            {t("tr.doc.remove")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default DocumentUpload;
