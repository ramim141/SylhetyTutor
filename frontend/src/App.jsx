import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Component gallery for development only; not included in the production bundle
const DevUI = import.meta.env.DEV ? lazy(() => import("./pages/DevUI")) : null;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
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
  );
}
