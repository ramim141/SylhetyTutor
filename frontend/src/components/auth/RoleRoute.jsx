import { Link, Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/Button";
import { ProtectedRoute } from "./ProtectedRoute";

/**
 * A page for some roles only. Signed-out visitors go to login (ProtectedRoute); a signed-in
 * user with the wrong role sees "no access" instead of being bounced to login in a loop.
 * The server enforces the same rule: this only decides what to show.
 */
export function RoleRoute({ roles, children }) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  // If a tutor accesses a requirement-posting or guardian-management page, redirect them to tuition list
  if (user?.role === "tutor" && !roles.includes("tutor") && roles.includes("guardian")) {
    return <Navigate to="/tutor/requirements" replace />;
  }

  let bodyKey = "forbidden.body";
  if (roles.includes("guardian") && !roles.includes("admin") && !roles.includes("tutor")) {
    bodyKey = "forbidden.guardianOnly";
  } else if (roles.includes("tutor") && !roles.includes("admin") && !roles.includes("guardian")) {
    bodyKey = "forbidden.tutorOnly";
  } else if (roles.includes("admin") && !roles.includes("guardian") && !roles.includes("tutor")) {
    bodyKey = "forbidden.adminOnly";
  }

  return (
    <ProtectedRoute>
      {roles.includes(user?.role) ? (
        children
      ) : (
        <div className="min-h-dvh bg-bg flex items-center justify-center px-4">
          <div className="max-w-sm text-center flex flex-col items-center gap-4">
            <ShieldAlert className="w-10 h-10 text-fg-muted" aria-hidden />
            <h1 className="text-xl font-display font-bold text-fg">{t("forbidden.title")}</h1>
            <p className="text-fg-secondary text-sm leading-relaxed">{t(bodyKey)}</p>
            <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
              <Link to="/dashboard" className="flex-1">
                <Button className="w-full">{t("dashboard.title")}</Button>
              </Link>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => logout()}
              >
                {t("forbidden.switchAccount")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

export default RoleRoute;
