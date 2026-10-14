import { lazy, Suspense, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { RoleRoute } from "./components/auth/RoleRoute";
import { RouteFallback } from "./components/layout/RouteFallback";
import { useAuthStore } from "./store/authStore";

// The first pages a visitor sees (Home, Search, Login, Register) load with the app. The rest are
// fetched when first opened, which keeps the first download small on a slow phone connection.
const TutorProfile = lazy(() => import("./pages/TutorProfile"));
const TutorRegistration = lazy(() => import("./pages/TutorRegistration"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Notifications = lazy(() => import("./pages/Notifications"));
const MyRequirements = lazy(() => import("./pages/requirements/MyRequirements"));
const RequirementForm = lazy(() => import("./pages/requirements/RequirementForm"));
const TutorRequirements = lazy(() => import("./pages/tutor/TutorRequirements"));
const VerificationQueue = lazy(() => import("./pages/admin/VerificationQueue"));
const VerificationDetail = lazy(() => import("./pages/admin/VerificationDetail"));

// Component gallery for development only; not included in the production bundle
const DevUI = import.meta.env.DEV ? lazy(() => import("./pages/DevUI")) : null;

export default function App() {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tutors" element={<Search />} />
        <Route path="/tutors/:slug" element={<TutorProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/tutor/profile"
          element={
            <ProtectedRoute>
              <TutorRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requirements"
          element={
            <RoleRoute roles={["guardian"]}>
              <MyRequirements />
            </RoleRoute>
          }
        />
        <Route
          path="/requirements/new"
          element={
            <RoleRoute roles={["guardian"]}>
              <RequirementForm />
            </RoleRoute>
          }
        />
        <Route
          path="/requirements/:id/edit"
          element={
            <RoleRoute roles={["guardian"]}>
              <RequirementForm />
            </RoleRoute>
          }
        />
        <Route
          path="/tutor/requirements"
          element={
            <RoleRoute roles={["tutor"]}>
              <TutorRequirements />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/verification"
          element={
            <RoleRoute roles={["admin"]}>
              <VerificationQueue />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/verification/:id"
          element={
            <RoleRoute roles={["admin"]}>
              <VerificationDetail />
            </RoleRoute>
          }
        />
        {DevUI && (
          <Route
            path="/dev/ui"
            element={
              <Suspense fallback={null}>
                <DevUI />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
