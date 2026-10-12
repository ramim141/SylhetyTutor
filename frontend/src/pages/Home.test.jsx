import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

const tutor = (name) => ({
  id: name,
  name,
  initials: name.slice(0, 2).toUpperCase(),
  avatarUrl: null,
  university: "SUST",
  area: "Amberkhana",
  subjects: ["Physics"],
  classes: ["HSC"],
  rating: 0,
  reviewCount: 0,
  feeMin: 3000,
  feeMax: 5000,
  isFeatured: false,
  isVerified: true,
});

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{`${pathname}${search}`}</output>;
}

const renderHome = () =>
  render(
    <MemoryRouter>
      <Where />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tutors" element={<div>Search Page</div>} />
      </Routes>
    </MemoryRouter>
  );

const where = () => screen.getByTestId("where").textContent;

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLookups.mockResolvedValue(LOOKUPS);
    useAuthStore.setState({ user: null, status: "guest" });
  });

  it("shows an honest empty state for visitors when no tutors are verified yet", async () => {
    getTutors.mockResolvedValue({ count: 0, results: [] });
    renderHome();

    expect(await screen.findByText(mixed["home.empty.title"])).toBeInTheDocument();
    expect(screen.queryByText(/django/i)).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument(); // no "0 verified tutors"
    expect(screen.queryByRole("link", { name: new RegExp(mixed["home.viewAll"]) })).not.toBeInTheDocument();
  });

  it("offers a retry when tutors fail to load", async () => {
    getTutors
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({ count: 0, results: [] });
    renderHome();

    await userEvent.click(await screen.findByRole("button", { name: mixed["common.retry"] }));

    expect(await screen.findByText(mixed["home.empty.title"])).toBeInTheDocument();
    expect(getTutors).toHaveBeenCalledTimes(2);
  });

  it("previews only the top tutors and links to the full search", async () => {
    getTutors.mockResolvedValue({ count: 26, results: [tutor("Rahim Uddin"), tutor("Salma Akter")] });
    renderHome();

    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
    expect(getTutors).toHaveBeenCalledWith({ page_size: 6 });
    expect(screen.getByText("26")).toBeInTheDocument(); // the real total, not the 6 shown
    expect(screen.getByRole("link", { name: new RegExp(mixed["home.viewAll"]) })).toHaveAttribute(
      "href",
      "/tutors"
    );
  });

  it("typing in the search box does not hit the API; submitting opens the search page", async () => {
    getTutors.mockResolvedValue({ count: 0, results: [] });
    const user = userEvent.setup();
    renderHome();
    await screen.findByText(mixed["home.empty.title"]);

    await user.type(screen.getByRole("searchbox"), "physics amberkhana");
    expect(getTutors).toHaveBeenCalledTimes(1);

    await user.keyboard("{Enter}");

    expect(await screen.findByText("Search Page")).toBeInTheDocument();
    expect(where()).toBe("/tutors?q=physics+amberkhana");
  });

  it("an empty search still opens the full list", async () => {
    getTutors.mockResolvedValue({ count: 0, results: [] });
    const user = userEvent.setup();
    renderHome();
    await screen.findByText(mixed["home.empty.title"]);

    await user.type(screen.getByRole("searchbox"), "{Enter}");

    expect(where()).toBe("/tutors");
  });

  it("an area chip opens the search page for that area", async () => {
    getTutors.mockResolvedValue({ count: 0, results: [] });
    renderHome();

    const chip = await screen.findByRole("link", { name: "আম্বরখানা" });
    expect(chip).toHaveAttribute("href", "/tutors?area=amberkhana");
    await userEvent.click(chip);

    expect(await screen.findByText("Search Page")).toBeInTheDocument();
    expect(where()).toBe("/tutors?area=amberkhana");
  });

  it("the phone filter button lists every area as a link to its search", async () => {
    getTutors.mockResolvedValue({ count: 0, results: [] });
    renderHome();

    await userEvent.click(screen.getByRole("button", { name: mixed["home.filter"] }));
    const sheet = within(screen.getByRole("dialog", { name: mixed["home.filterTitle"] }));
    await userEvent.click(await sheet.findByRole("link", { name: "জিন্দাবাজার" }));

    expect(where()).toBe("/tutors?area=zindabazar");
  });

  it("post sheet explains posting is coming instead of pretending to save", async () => {
    getTutors.mockResolvedValue({ count: 0, results: [] });
    renderHome();

    await userEvent.click(screen.getByRole("button", { name: mixed["nav.post"] }));

    expect(screen.getByText(mixed["post.comingSoon"])).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["post.registerCta"] })).toHaveAttribute(
      "href",
      "/register"
    );
  });

  it("the post sheet's browse button goes to the search page", async () => {
    getTutors.mockResolvedValue({ count: 0, results: [] });
    renderHome();

    await userEvent.click(screen.getByRole("button", { name: mixed["nav.post"] }));
    await userEvent.click(screen.getByRole("button", { name: mixed["post.browseCta"] }));

    expect(where()).toBe("/tutors");
  });
});
