import { useEffect, useState } from "react";
import { Maximize2, ShieldAlert, X } from "lucide-react";
import { useTranslation } from "../../i18n";
import { getDocumentBlob } from "../../api/admin";
import { Button } from "../ui/Button";

/**
 * One NID / student-ID scan for an admin. The image is fetched with the login token into a
 * short-lived blob URL (revoked when the viewer goes away); nothing is cached by the page.
 */
export function DocumentViewer({ kind, url }) {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${url}#${attempt}`;
  const [result, setResult] = useState({ key: null, status: "loading", src: null });
  const [zoomed, setZoomed] = useState(false);
  const state = result.key === requestKey ? result.status : "loading";

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = null;
    getDocumentBlob(url, { signal: controller.signal })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setResult({ key: requestKey, status: "ready", src: objectUrl });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key: requestKey, status: "error", src: null });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, requestKey]);

  const label = t(`admin.docs.${kind}`);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-display font-semibold text-fg">{label}</figcaption>
      {state === "loading" && (
        <div
          role="status"
          className="h-48 rounded-lg bg-bg-subtle border border-border flex items-center justify-center text-sm text-fg-secondary"
        >
          {t("common.loading")}
        </div>
      )}
      {state === "error" && (
        <div
          role="alert"
          className="rounded-lg bg-error-bg border border-error/30 p-4 flex flex-col gap-3"
        >
          <p className="text-sm text-error">{t("admin.docs.loadFailed", { name: label })}</p>
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            {t("common.retry")}
          </Button>
        </div>
      )}
      {state === "ready" && (
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label={t("admin.docs.open", { name: label })}
          className="relative block rounded-lg overflow-hidden border border-border bg-bg-subtle cursor-zoom-in focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange/50"
        >
          <img src={result.src} alt={label} className="w-full max-h-72 object-contain" />
          <span
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center text-fg-secondary"
            aria-hidden
          >
            <Maximize2 className="w-4 h-4" />
          </span>
        </button>
      )}

      {zoomed && state === "ready" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-60 bg-bg flex flex-col"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <ShieldAlert className="w-5 h-5 text-warning shrink-0" aria-hidden />
            <p className="text-xs text-fg-secondary flex-1">{t("admin.docs.warning")}</p>
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label={t("common.close")}
              className="w-11 h-11 flex items-center justify-center rounded-full text-fg-secondary hover:text-fg cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2 flex items-start justify-center">
            <img src={result.src} alt={label} className="max-w-none w-[min(100%,1400px)] h-auto" />
          </div>
        </div>
      )}
    </figure>
  );
}
