import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { mixed } from "../../i18n";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuthStore } from "../../store/authStore";

describe("ProtectedRoute", () => {
  it("shows loading indicator when auth status is loading", () => {
    useAuthStore.setState({ status: "loading", user: null });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute><div>Private Content</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toHaveTextContent(mixed["common.loading"]);
    expect(screen.queryByText("Private Content")).not.toBeInTheDocument();
  });

  it("offers a retry instead of logging out when the server is unreachable", async () => {
    const loadUser = vi.fn();
    useAuthStore.setState({ status: "error", user: null, loadUser });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute><div>Private Content</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: mixed["common.retry"] }));
    expect(loadUser).toHaveBeenCalledOnce();
  });

  it("redirects unauthenticated guest to /login", () => {
    useAuthStore.setState({ status: "guest", user: null });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute><div>Private Content</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Private Content")).not.toBeInTheDocument();
  });

  it("renders protected content when authenticated", () => {
    useAuthStore.setState({
      status: "authenticated",
      user: { id: "1", full_name: "Tutor Test", role: "tutor" },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute><div>Private Content</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Private Content")).toBeInTheDocument();
  });
});
