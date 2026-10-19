import { useLocation, useNavigate } from "react-router-dom";
import { Home, Search, PlusCircle, MapPin, User, ClipboardList } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../store/authStore";

const ACCOUNT_PATHS = ["/dashboard", "/admin/dashboard", "/login", "/register"];

/**
 * Mobile tab bar (DESIGN.md 6.5). Works on any page: Home passes onTabChange to open
 * its sheets in place; elsewhere tabs navigate, and Home picks up the requested tab
 * from router state (see Home's useEffect on location.state).
 */
export function BottomNav({ activeTab, onTabChange }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, status } = useAuthStore();

  const current =
    activeTab ??
    (ACCOUNT_PATHS.includes(pathname)
      ? "account"
      : pathname.startsWith("/tutors")
        ? "tutors"
        : pathname.startsWith("/tutor/requirements")
          ? "tuitions"
          : "home");

  const accountLabel =
    status === "authenticated" && user
      ? user.full_name?.split(" ")[0] || t("nav.account")
      : t("nav.signIn");

  const isTutor = status === "authenticated" && user?.role === "tutor";

  const tabs = [
    { id: "home", label: t("nav.home"), icon: Home },
    { id: "tutors", label: isTutor ? t("nav.browseTutors") : t("nav.findTutors"), icon: Search },
    isTutor
      ? { id: "tuitions", label: t("nav.tuitions"), icon: ClipboardList, isAction: true }
      : { id: "post", label: t("nav.post"), icon: PlusCircle, isAction: true },
    { id: "areas", label: t("nav.areas"), icon: MapPin },
    { id: "account", label: accountLabel, icon: User },
  ];

  const handleTab = (id) => {
    if (onTabChange) return onTabChange(id);
    if (id === "account")
      return navigate(
        status === "authenticated"
          ? user?.role === "admin"
            ? "/admin/dashboard"
            : "/dashboard"
          : "/login"
      );
    if (id === "tutors") return navigate("/tutors");
    if (id === "tuitions") return navigate("/tutor/requirements");
    navigate("/", id === "home" ? undefined : { state: { tab: id } });
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-bg/95 backdrop-blur-xl border-t border-border shadow-lg pb-[env(safe-area-inset-bottom)] transition-colors"
      aria-label={t("nav.mobileLabel")}
    >
      <div className="grid grid-cols-5 items-end max-w-md mx-auto px-1">
        {tabs.map(({ id, label, icon: Icon, isAction }) => {
          const isActive = current === id;

          if (isAction) {
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTab(id)}
                className="flex flex-col items-center justify-end min-h-14 pb-1.5 group cursor-pointer"
              >
                <span className="-mt-6 w-13 h-13 rounded-full bg-orange text-on-orange flex items-center justify-center shadow-md shadow-orange/30 ring-4 ring-bg group-active:scale-95 transition-transform">
                  <Icon className="w-6 h-6" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="text-[11px] leading-tight font-display font-bold text-orange-text mt-1">
                  {label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={id}
              type="button"
              onClick={() => handleTab(id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-h-14 px-1 cursor-pointer select-none active:scale-95 transition ${
                isActive ? "text-orange-text" : "text-fg-secondary hover:text-fg"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} aria-hidden />
              <span
                className={`text-[11px] leading-tight font-display truncate max-w-full ${
                  isActive ? "font-bold" : "font-medium"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
