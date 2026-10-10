import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useTranslation } from "../../i18n";

const OPTIONS = [
  { code: "en", short: "EN" },
  { code: "bn", short: "বাং" },
  { code: "mixed", short: "Mix" },
];

/**
 * One compact button showing the current language; opens a small menu with the three
 * choices (EN / বাং / Mixed). Closes on outside tap, Escape, or after choosing.
 */
export function LanguageMenu({ className = "" }) {
  const { t, lang, setLang } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = OPTIONS.find((o) => o.code === lang) || OPTIONS[2];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (code) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("nav.langSelect")}: ${t(`lang.${current.code}`)}`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-lg border border-border bg-bg-card text-sm font-display font-semibold text-fg hover:bg-bg-subtle active:scale-95 transition cursor-pointer"
      >
        <Globe className="w-4 h-4 text-orange" aria-hidden />
        {current.short}
        <ChevronDown
          className={`w-4 h-4 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("nav.langSelect")}
          className="absolute right-0 top-full mt-2 z-30 min-w-44 p-1 rounded-lg border border-border bg-bg-card shadow-lg"
        >
          {OPTIONS.map(({ code }) => {
            const selected = lang === code;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(code)}
                className={`w-full min-h-11 px-3 flex items-center justify-between gap-3 rounded-md text-sm font-display font-semibold text-left cursor-pointer transition-colors ${
                  selected ? "bg-orange-light text-orange-text" : "text-fg hover:bg-bg-subtle"
                }`}
              >
                {t(`lang.${code}`)}
                {selected && <Check className="w-4 h-4" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
