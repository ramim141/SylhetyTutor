import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";

/** Bell with the unread count; renders nothing for guests. Refreshes on load and when the tab regains focus. */
export function NotificationBell({ className = "" }) {
  const { t } = useTranslation();
  const status = useAuthStore((state) => state.status);
  const unread = useNotificationStore((state) => state.unread);
  const refresh = useNotificationStore((state) => state.refresh);
  const reset = useNotificationStore((state) => state.reset);
  const signedIn = status === "authenticated";

  useEffect(() => {
    if (!signedIn) {
      reset();
      return undefined;
    }
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [signedIn, refresh, reset]);

  if (!signedIn) return null;

  const label = unread > 0 ? t("notif.bellUnread", { count: unread }) : t("notif.bell");
  return (
    <Link
      to="/notifications"
      aria-label={label}
      title={label}
      className={`relative w-11 h-11 md:w-9 md:h-9 flex items-center justify-center rounded-full md:rounded-md text-fg-secondary hover:text-fg bg-bg-card md:bg-bg-subtle border border-border transition-colors ${className}`}
    >
      <Bell className="w-5 h-5 md:w-4 md:h-4" aria-hidden />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-orange text-on-orange text-[11px] font-display font-bold flex items-center justify-center tabular-nums"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
