import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, CalendarCheck, CheckCircle2, CircleAlert, UserPlus } from "lucide-react";
import { useTranslation } from "../i18n";
import { getNotifications, markAllRead, markRead } from "../api/notifications";
import { useNotificationStore } from "../store/notificationStore";
import { useAuthStore } from "../store/authStore";
import { formatDateTime } from "../utils/dateTime";
import { Button } from "../components/ui/Button";
import { BottomNav } from "../components/layout/BottomNav";

const KINDS = {
  profile_approved: { icon: CheckCircle2, tone: "text-success", to: "/dashboard" },
  profile_rejected: { icon: CircleAlert, tone: "text-error", to: "/tutor/profile" },
  application_received: {
    icon: UserPlus,
    tone: "text-info",
    to: (data) => `/requirements/${data.requirement_id}/applicants`,
  },
  application_shortlisted: { icon: CheckCircle2, tone: "text-success", to: "/tutor/applications" },
  application_rejected: { icon: CircleAlert, tone: "text-fg-muted", to: "/tutor/applications" },
  demo_booked: {
    icon: CalendarCheck,
    tone: "text-success",
    // the guardian opens the applicants list, the tutor opens their applications
    to: (data, role) =>
      role === "guardian" ? `/requirements/${data.requirement_id}/applicants` : "/tutor/applications",
  },
};

function NotificationItem({ item, onOpen }) {
  const { t, has, lang } = useTranslation();
  const role = useAuthStore((state) => state.user?.role);
  const kind = KINDS[item.kind];
  const target = typeof kind?.to === "function" ? kind.to(item.data || {}, role) : kind?.to;
  const Icon = kind?.icon || Bell;
  const known = has(`notif.${item.kind}.title`);
  const when = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(item.created_at));
  const unread = !item.read_at;

  return (
    <li
      className={`bg-bg-card border rounded-lg p-4 shadow-card flex gap-3 ${
        unread ? "border-orange/40" : "border-border"
      }`}
    >
      <Icon className={`w-6 h-6 shrink-0 ${kind?.tone || "text-fg-muted"}`} aria-hidden />
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display font-bold text-fg">
            {known ? t(`notif.${item.kind}.title`) : t("notif.other")}
          </h2>
          {unread && (
            <span className="shrink-0 text-xs font-display font-semibold text-orange-text">
              {t("notif.unread")}
            </span>
          )}
        </div>
        {known && (
          <p className="text-sm text-fg-secondary break-words">
            {t(`notif.${item.kind}.body`, {
              reason: item.data?.reason || "",
              when: item.data?.demo_at ? formatDateTime(item.data.demo_at, lang) : "",
            })}
          </p>
        )}
        <p className="text-xs text-fg-muted">{when}</p>
        {kind && (
          <Link
            to={target}
            onClick={() => unread && onOpen(item)}
            className="mt-1 inline-flex items-center min-h-11 text-sm font-display font-semibold text-orange-text hover:underline"
          >
            {t(`notif.${item.kind}.cta`)}
          </Link>
        )}
      </div>
    </li>
  );
}

export default function Notifications() {
  const { t } = useTranslation();
  const setUnread = useNotificationStore((state) => state.setUnread);
  const [state, setState] = useState({ status: "loading", items: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getNotifications()
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ready", items: data.results });
        setUnread(data.unread_count);
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, setUnread]);

  const retry = () => {
    setState({ status: "loading", items: [] });
    setAttempt((n) => n + 1);
  };

  const readOne = useCallback(async (item) => {
    const now = new Date().toISOString();
    setState((s) => ({
      ...s,
      items: s.items.map((n) => (n.id === item.id ? { ...n, read_at: now } : n)),
    }));
    useNotificationStore.setState((s) => ({ unread: Math.max(0, s.unread - 1) }));
    try {
      await markRead(item.id);
    } catch {
      useNotificationStore.getState().refresh();
    }
  }, []);

  const readAll = async () => {
    try {
      await markAllRead();
      const now = new Date().toISOString();
      setState((s) => ({ ...s, items: s.items.map((n) => ({ ...n, read_at: n.read_at || now })) }));
      setUnread(0);
    } catch {
      useNotificationStore.getState().refresh();
    }
  };

  const hasUnread = state.items.some((n) => !n.read_at);

  return (
    <div className="min-h-dvh bg-bg-subtle text-fg pb-28 md:pb-10">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-2 h-14 flex items-center gap-1">
          <Link
            to="/dashboard"
            className="w-11 h-11 flex items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-bg-subtle"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </Link>
          <h1 className="text-lg font-display font-bold flex-1">{t("notif.title")}</h1>
          {hasUnread && (
            <Button variant="ghost" size="sm" onClick={readAll}>
              {t("notif.markAll")}
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-3">
        {state.status === "loading" && (
          <p role="status" className="text-sm text-fg-secondary text-center py-10">
            {t("common.loading")}
          </p>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="bg-bg-card border border-border rounded-lg p-5 flex flex-col gap-3"
          >
            <p className="text-sm text-error">{t("notif.loadFailed")}</p>
            <Button variant="outline" onClick={retry} className="w-full">
              {t("common.retry")}
            </Button>
          </div>
        )}
        {state.status === "ready" && state.items.length === 0 && (
          <div className="bg-bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3 text-center">
            <Bell className="w-8 h-8 text-fg-muted" aria-hidden />
            <p className="text-sm text-fg-secondary">{t("notif.empty")}</p>
          </div>
        )}
        {state.status === "ready" && state.items.length > 0 && (
          <ul className="flex flex-col gap-3">
            {state.items.map((item) => (
              <NotificationItem key={item.id} item={item} onOpen={readOne} />
            ))}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
