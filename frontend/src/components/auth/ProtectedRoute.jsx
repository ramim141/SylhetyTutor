import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { status } = useAuthStore();

  if (status === "loading" || status === "idle") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange/20 border-t-orange rounded-full animate-spin" />
          <p className="text-sm text-fg-secondary font-display font-medium animate-pulse">
            Loading...
          </p>
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
