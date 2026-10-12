import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "../../i18n";

// Tailwind needs whole class names, so the breakpoint where the sheet gives way is a lookup
const HIDE_AT = { md: "md:hidden", lg: "lg:hidden" };

/**
 * Mobile slide-up sheet. `hideAt` is where a desktop layout takes over (default md);
 * `footer` stays pinned at the bottom (e.g. Apply / Clear).
 */
export function BottomSheet({ isOpen, onClose, title, children, footer, hideAt = "md" }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Bottom sheet dialog"}
      // z-60: above the phone tab bar (z-50), or the sheet's own buttons would sit behind it
      className={`fixed inset-0 z-60 ${HIDE_AT[hideAt] ?? HIDE_AT.md} flex flex-col justify-end`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Box */}
      <div className="relative bg-bg-card border-t border-border rounded-t-2xl shadow-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-300">
        {/* Grab Handle */}
        <div
          className="w-12 h-1.5 bg-fg-muted/30 rounded-full mx-auto mb-4 cursor-pointer"
          aria-hidden="true"
        />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border-light mb-4">
          <h3 className="font-display font-bold text-lg text-fg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1 text-fg-muted hover:text-fg rounded-full bg-bg-subtle cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-orange/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>

        {footer && (
          <div className="sticky -bottom-8 -mx-5 -mb-8 mt-5 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-bg-card border-t border-border-light">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
