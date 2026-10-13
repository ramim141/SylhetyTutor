import { Link } from "react-router-dom";
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
  const user = useAuthStore((state) => state.user);

  return (
    <ProtectedRoute>
      {roles.includes(user?.role) ? (
        children
      ) : (
        <div className="min-h-dvh bg-bg flex items-center justify-center px-4">
          <div className="max-w-sm text-center flex flex-col items-center gap-4">
            <ShieldAlert className="w-10 h-10 text-fg-muted" aria-hidden />
            <h1 className="text-xl font-display font-bold text-fg">{t("forbidden.title")}</h1>
            <p className="text-fg-secondary">{t("forbidden.body")}</p>
            <Link to="/dashboard" className="w-full">
              <Button className="w-full">{t("dashboard.title")}</Button>
            </Link>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

export default RoleRoute;
