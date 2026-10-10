import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { mixed } from "./i18n";
import { useAuthStore } from "./store/authStore";

// Pages fetch lookups/tutors on mount; routing tests must not hit a real server
vi.mock("./api/lookups", () => ({ getLookups: vi.fn().mockResolvedValue({ areas: [], subjects: [], universities: [] }) }));
vi.mock("./api/tutors", () => ({ getTutors: vi.fn().mockResolvedValue([]) }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("routes", () => {
  it("renders the home page at /", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { level: 1, name: mixed["hero.title"] })).toBeInTheDocument();
  });

  it("renders the login page at /login", () => {
    renderAt("/login");

    expect(screen.getByRole("heading", { level: 1, name: mixed["auth.login.title"] })).toBeInTheDocument();
  });

  it("renders the register page at /register", () => {
    renderAt("/register");

    expect(screen.getByRole("heading", { level: 1, name: mixed["reg.title"] })).toBeInTheDocument();
  });

  it("redirects unauthenticated users visiting /dashboard to /login", () => {
    useAuthStore.setState({ status: "guest", user: null });
    renderAt("/dashboard");

    expect(screen.getByRole("heading", { level: 1, name: mixed["auth.login.title"] })).toBeInTheDocument();
  });

  it("renders the 404 page with a link home for unknown paths", () => {
    renderAt("/does-not-exist");

    expect(screen.getByRole("heading", { name: mixed["notFound.title"] })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["notFound.backHome"] })).toHaveAttribute("href", "/");
  });

  it("serves the component gallery at /dev/ui in development", async () => {
    renderAt("/dev/ui");

    expect(await screen.findByRole("heading", { name: /component gallery/i })).toBeInTheDocument();
  });
});
