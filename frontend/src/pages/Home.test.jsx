import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";
import { mixed } from "../i18n";
import { getTutors } from "../api/tutors";
import { getLookups } from "../api/lookups";
import { useAuthStore } from "../store/authStore";

vi.mock("../api/tutors", () => ({ getTutors: vi.fn() }));
vi.mock("../api/lookups", () => ({ getLookups: vi.fn() }));

const LOOKUPS = {
  areas: [
    { id: "a1", slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
    { id: "a2", slug: "zindabazar", name_en: "Zindabazar", name_bn: "জিন্দাবাজার" },
  ],
  subjects: [{ id: "s1" }],
  universities: [{ id: "u1" }],
};

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLookups.mockResolvedValue(LOOKUPS);
    useAuthStore.setState({ user: null, status: "guest" });
  });

  it("shows an honest empty state for visitors when no tutors are verified yet", async () => {
    getTutors.mockResolvedValue({ results: [] });
    renderHome();

    expect(await screen.findByText(mixed["home.empty.title"])).toBeInTheDocument();
    expect(screen.queryByText(/django/i)).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument(); // no "0 verified tutors"
  });

  it("offers a retry when tutors fail to load", async () => {
    getTutors.mockRejectedValueOnce(new Error("Network Error")).mockResolvedValueOnce({ results: [] });
    renderHome();

    await userEvent.click(await screen.findByRole("button", { name: mixed["common.retry"] }));

    expect(await screen.findByText(mixed["home.empty.title"])).toBeInTheDocument();
    expect(getTutors).toHaveBeenCalledTimes(2);
  });

  it("filters by area from the bottom sheet", async () => {
    getTutors.mockResolvedValue({ results: [] });
    renderHome();

    await userEvent.click(screen.getByRole("button", { name: mixed["home.filter"] }));
    const sheet = screen.getByRole("radiogroup", { name: mixed["home.filterTitle"] });
    await userEvent.click(await within(sheet).findByRole("radio", { name: "আম্বরখানা" }));
    await userEvent.click(screen.getByRole("button", { name: mixed["home.filterApply"] }));

    await vi.waitFor(() =>
      expect(getTutors).toHaveBeenLastCalledWith({ area: "amberkhana" })
    );
  });

  it("post sheet explains posting is coming instead of pretending to save", async () => {
    getTutors.mockResolvedValue({ results: [] });
    renderHome();

    await userEvent.click(screen.getByRole("button", { name: mixed["nav.post"] }));

    expect(screen.getByText(mixed["post.comingSoon"])).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["post.registerCta"] })).toHaveAttribute(
      "href",
      "/register"
    );
  });
});
