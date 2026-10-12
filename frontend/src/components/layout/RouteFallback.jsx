import { useTranslation } from "../../i18n";

/** Shown for the instant a page's code is still being fetched (the heavier pages are split off). */
export function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 border-4 border-orange/20 border-t-orange rounded-full animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        <p className="text-sm text-fg-secondary font-display font-medium">{t("common.loading")}</p>
      </div>
    </div>
  );
}

export default RouteFallback;
