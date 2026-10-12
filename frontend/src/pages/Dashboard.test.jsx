import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./Dashboard";
import { bn, mixed } from "../i18n";
import { authApi } from "../api/auth";
import { getMyProfile } from "../api/tutors";
import { useAuthStore } from "../store/authStore";
import { useLanguageStore } from "../store/languageStore";

vi.mock("../api/tutors", () => ({ getMyProfile: vi.fn() }));
vi.mock("../api/auth", () => ({
  authApi: {
    updateMe: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  },
}));

const guardian = {
  id: "1",
  full_name: "Rahim Uddin",
  phone: "01712345678",
  email: null,
  role: "guardian",
  preferred_language: "mixed",
  date_joined: "2026-10-10T10:00:00+06:00",
};

function renderDashboard(user = guardian) {
  useAuthStore.setState({ user, status: "authenticated" });
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/tutors" element={<div>Search Page</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
  });

  it("shows the guardian their next step with a way to browse tutors", async () => {
    renderDashboard();

    expect(screen.getByRole("heading", { name: "Rahim Uddin" })).toBeInTheDocument();
    expect(screen.getByText("01712345678")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: mixed["dashboard.guardian.nextCta"] }),
    );
    expect(screen.getByText("Search Page")).toBeInTheDocument();
  });

  it("shows a tutor where their profile stands instead of the guardian's search prompt", async () => {
    getMyProfile.mockResolvedValue({
      status: "draft",
      missing: ["gender", "nid_photo"],
      required_total: 13,
      documents: {},
    });
    renderDashboard({ ...guardian, role: "tutor" });

    expect(await screen.findByText(mixed["tr.status.draft.title"])).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: mixed["dashboard.guardian.nextCta"] }),
    ).not.toBeInTheDocument();
  });

  it("does not ask a guardian for a tutor profile", () => {
    renderDashboard();

    expect(getMyProfile).not.toHaveBeenCalled();
  });

  it("saves the chosen language to the account", async () => {
    authApi.updateMe.mockResolvedValueOnce({ ...guardian, preferred_language: "bn" });
    renderDashboard();

    await userEvent.click(screen.getByRole("radio", { name: mixed["lang.bn"] }));

    expect(authApi.updateMe).toHaveBeenCalledWith({ preferred_language: "bn" });
    expect(useLanguageStore.getState().lang).toBe("bn");
    // Confirmation appears in the newly chosen language
    expect(await screen.findByText(bn["dashboard.languageSaved"])).toBeInTheDocument();
    expect(useAuthStore.getState().user.preferred_language).toBe("bn");
  });

  it("logs out and returns to the login page", async () => {
    renderDashboard();

    await userEvent.click(screen.getByRole("button", { name: mixed["dashboard.logout"] }));

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
    expect(useAuthStore.getState().status).toBe("guest");
  });
});
