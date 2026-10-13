import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { mixed } from "../../i18n";
import { RoleRoute } from "./RoleRoute";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

function renderAt(roles = ["admin"]) {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <RoleRoute roles={roles}>
              <div>Secret Queue</div>
            </RoleRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RoleRoute", () => {
  beforeEach(() => useLanguageStore.setState({ lang: "mixed" }));

  it("sends a signed-out visitor to login", () => {
    useAuthStore.setState({ status: "guest", user: null });
    renderAt();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("shows the page to the right role", () => {
    useAuthStore.setState({ status: "authenticated", user: { role: "admin" } });
    renderAt();
    expect(screen.getByText("Secret Queue")).toBeInTheDocument();
  });

  it.each(["guardian", "tutor"])(
    "tells a %s there is no access, without bouncing to login",
    (role) => {
      useAuthStore.setState({ status: "authenticated", user: { role } });
      renderAt();
      expect(screen.queryByText("Secret Queue")).not.toBeInTheDocument();
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
      expect(screen.getByText(mixed["forbidden.title"])).toBeInTheDocument();
    },
  );
});
