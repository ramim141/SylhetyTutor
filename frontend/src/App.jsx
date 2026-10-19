import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { RoleRoute } from "./components/auth/RoleRoute";
import { RouteFallback } from "./components/layout/RouteFallback";
import { CookieConsent } from "./components/layout/CookieConsent";
import { captureUTM } from "./utils/utm";
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
const TutorApplications = lazy(() => import("./pages/tutor/TutorApplications"));
const TutorPayments = lazy(() => import("./pages/tutor/TutorPayments"));
const ConfirmTuition = lazy(() => import("./pages/ConfirmTuition"));
const PaymentsAdmin = lazy(() => import("./pages/admin/PaymentsAdmin"));
const ReportsAdmin = lazy(() => import("./pages/admin/ReportsAdmin"));
const Applicants = lazy(() => import("./pages/requirements/Applicants"));
const VerificationQueue = lazy(() => import("./pages/admin/VerificationQueue"));
const VerificationDetail = lazy(() => import("./pages/admin/VerificationDetail"));
const About = lazy(() => import("./pages/About"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Safety = lazy(() => import("./pages/Safety"));
const AreaLanding = lazy(() => import("./pages/AreaLanding"));

// Component gallery for development only; not included in the production bundle
const DevUI = import.meta.env.DEV ? lazy(() => import("./pages/DevUI")) : null;

export default function App() {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    captureUTM();
    loadUser();
  }, [loadUser]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tutors" element={<Search />} />
        <Route path="/tutors/:slug" element={<TutorProfile />} />
        <Route path="/tutors/area/:slug" element={<AreaLanding />} />
        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/safety" element={<Safety />} />
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
            <RoleRoute roles={["guardian", "admin"]}>
              <MyRequirements />
            </RoleRoute>
          }
        />
        <Route
          path="/requirements/new"
          element={
            <RoleRoute roles={["guardian", "admin"]}>
              <RequirementForm />
            </RoleRoute>
          }
        />
        <Route path="/post-requirement" element={<Navigate to="/requirements/new" replace />} />
        <Route
          path="/requirements/:id/edit"
          element={
            <RoleRoute roles={["guardian", "admin"]}>
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
          path="/tutor/applications"
          element={
            <RoleRoute roles={["tutor"]}>
              <TutorApplications />
            </RoleRoute>
          }
        />
        <Route
          path="/tutor/payments"
          element={
            <RoleRoute roles={["tutor"]}>
              <TutorPayments />
            </RoleRoute>
          }
        />
        <Route
          path="/requirements/:id/applicants"
          element={
            <RoleRoute roles={["guardian", "admin"]}>
              <Applicants />
            </RoleRoute>
          }
        />
        <Route path="/confirm/:token" element={<ConfirmTuition />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <RoleRoute roles={["admin"]}>
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <RoleRoute roles={["admin"]}>
              <PaymentsAdmin />
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
        <Route
          path="/admin/reports"
          element={
            <RoleRoute roles={["admin"]}>
              <ReportsAdmin />
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
      <CookieConsent />
    </Suspense>
  );
}
