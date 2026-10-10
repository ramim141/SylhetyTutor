import { Navigate, Outlet, useLocation } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/Button";

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { t } = useTranslation();
  const { status, loadUser } = useAuthStore();

  if (status === "loading" || status === "idle") {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center" role="status">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-4 border-orange/20 border-t-orange rounded-full animate-spin"
            aria-hidden
          />
          <p className="text-sm text-fg-secondary font-display font-medium">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center px-4">
        <div className="max-w-sm text-center flex flex-col items-center gap-4">
          <WifiOff className="w-10 h-10 text-fg-muted" aria-hidden />
          <p className="text-fg-secondary">{t("dashboard.sessionError")}</p>
          <Button onClick={loadUser} className="w-full">
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
