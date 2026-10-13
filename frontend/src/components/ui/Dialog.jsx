import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "../../i18n";

/**
 * A confirmation / small form on top of the page: a sheet from the bottom on phones, a
 * centered box on larger screens. Escape and the backdrop close it unless `busy`.
 */
export function Dialog({ isOpen, onClose, title, children, footer, busy = false }) {
  const { t } = useTranslation();
  const boxRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, busy, onClose]);

  // Only when it opens: this must not run again as the parent re-renders (typing would lose focus)
  useEffect(() => {
    if (isOpen) boxRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 w-full md:max-w-md bg-bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto focus:outline-hidden"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-lg text-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t("common.close")}
            className="w-11 h-11 -mt-2 -mr-2 flex items-center justify-center text-fg-muted hover:text-fg rounded-full cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
        {footer && (
          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
