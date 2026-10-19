import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TutorProfile from "./TutorProfile";
import { getTutor } from "../api/tutors";
import { en, mixed } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useLanguageStore } from "../store/languageStore";

vi.mock("../api/tutors", () => ({ getTutor: vi.fn() }));

const TUTOR = {
  id: "t1",
  userId: "tutor-user-1",
  slug: "rahim-uddin-physics-math",
  name: "Rahim Uddin",
  initials: "RU",
  avatarUrl: null,
  gender: "male",
  university: { slug: "sust", name_en: "SUST", name_bn: "সাস্ট", short_name: "SUST" },
  department: "Physics",
  year: "3rd Year",
  bio: "I teach physics\nand maths.",
  feeMin: 3000,
  feeMax: 5000,
  subjects: [
    { slug: "physics", name_en: "Physics", name_bn: "পদার্থবিজ্ঞান" },
    { slug: "math", name_en: "Math", name_bn: "গণিত" },
  ],
  classLevels: [{ slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" }],
  areas: [{ slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" }],
  availability: [{ day: "sat", slot: "evening" }],
  rating: 0,
  reviewCount: 0,
  isFeatured: false,
  isVerified: true,
};

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{`${pathname}${search}`}</output>;
}

function renderPage(entry = "/tutors/rahim-uddin-physics-math") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Where />
      <Routes>
        <Route path="/tutors/:slug" element={<TutorProfile />} />
        <Route path="/tutors" element={<div>Search Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TutorProfile page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({ user: null, status: "guest" });
    document.title = "SylhetyTutor";
    getTutor.mockResolvedValue(TUTOR);
  });

  it("asks for the tutor named in the address and shows a loading state first", async () => {
    renderPage();

    expect(screen.getByRole("status", { name: mixed["profile.loading"] })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Rahim Uddin" }),
    ).toBeInTheDocument();
    expect(getTutor).toHaveBeenCalledWith("rahim-uddin-physics-math", expect.any(Object));
  });

  it("shows the year of study in the chosen language", async () => {
    useLanguageStore.setState({ lang: "bn" });
    renderPage();

    expect(await screen.findByText(/৩য় বর্ষ/)).toBeInTheDocument();
  });

  it("shows who the tutor is: university, department, year, verified, fee", async () => {
    renderPage();

    await screen.findByText("Rahim Uddin");
    expect(screen.getByText("সাস্ট · Physics · 3rd Year")).toBeInTheDocument(); // Mixed keeps the English year // Mixed uses the Bangla name
    expect(screen.getAllByText(mixed["card.verifiedTitle"]).length).toBeGreaterThan(0);
    expect(screen.getByText("৳3,000–5,000")).toBeInTheDocument();
  });

  it("says New (not 0.0) for a tutor without reviews, and has an honest empty review section", async () => {
    renderPage();

    await screen.findByText("Rahim Uddin");
    expect(screen.getByText(mixed["card.new"])).toBeInTheDocument();
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
    expect(screen.getByText(mixed["profile.reviewsEmpty"])).toBeInTheDocument();
  });

  it("shows the real rating once there are reviews", async () => {
    getTutor.mockResolvedValue({ ...TUTOR, rating: 4.6, reviewCount: 12 });
    renderPage();

    expect(await screen.findByText("4.6")).toBeInTheDocument();
    expect(screen.getByText("(12)")).toBeInTheDocument();
    expect(screen.queryByText(mixed["card.new"])).not.toBeInTheDocument();
  });

  it("names subjects, classes and areas in the chosen language", async () => {
    useLanguageStore.setState({ lang: "en" });
    renderPage();

    await screen.findByText("Rahim Uddin");
    expect(screen.getByText("Physics", { selector: "li" })).toBeInTheDocument();
    expect(screen.getByText("Math", { selector: "li" })).toBeInTheDocument();
    expect(screen.getByText("HSC", { selector: "li" })).toBeInTheDocument();
    expect(screen.getByText("Amberkhana", { selector: "li" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: en["profile.subjects"] })).toBeInTheDocument();
  });

  it("shows the availability grid with the tutor's free slot", async () => {
    renderPage();

    await screen.findByText("Rahim Uddin");
    const table = screen.getByRole("table", { name: mixed["profile.availability"] });
    expect(table.querySelectorAll('[data-free="true"]')).toHaveLength(1);
  });

  it("skips empty sections instead of showing blank boxes", async () => {
    getTutor.mockResolvedValue({
      ...TUTOR,
      bio: "",
      subjects: [],
      areas: [],
      availability: [],
      feeMin: null,
      feeMax: null,
    });
    renderPage();

    await screen.findByText("Rahim Uddin");
    expect(screen.queryByRole("heading", { name: mixed["profile.about"] })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: mixed["profile.subjects"] }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(mixed["card.salary"]))).not.toBeInTheDocument();
    expect(screen.getByText(mixed["profile.noAvailability"])).toBeInTheDocument();
  });

  it("explains that the phone number stays private", async () => {
    renderPage();

    expect(await screen.findByText(mixed["profile.contactNote"])).toBeInTheDocument();
    expect(screen.queryByText(/01\d{9}/)).not.toBeInTheDocument();
  });

  it("puts the tutor's name in the browser tab and restores the title when leaving", async () => {
    const { unmount } = renderPage();

    await waitFor(() => expect(document.title).toBe("Rahim Uddin | SylhetyTutor"));
    unmount();
    expect(document.title).toBe("SylhetyTutor");
  });

  it("shows a friendly page, not an error, when the address is unknown", async () => {
    getTutor.mockRejectedValue({ response: { status: 404 } });
    renderPage("/tutors/nobody");

    expect(await screen.findByText(mixed["profile.notFoundTitle"])).toBeInTheDocument();
    expect(
      within(screen.getByRole("main")).getByRole("link", { name: mixed["profile.browse"] }),
    ).toHaveAttribute("href", "/tutors");
  });

  it("offers a retry when the server cannot be reached", async () => {
    getTutor.mockRejectedValueOnce(new Error("Network Error")).mockResolvedValueOnce(TUTOR);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(mixed["profile.error"])).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: mixed["common.retry"] }));

    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
    expect(getTutor).toHaveBeenCalledTimes(2);
  });

  it("the back link goes to the tutor list", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Rahim Uddin");

    await user.click(screen.getByRole("link", { name: mixed["profile.back"] }));

    expect(await screen.findByText("Search Page")).toBeInTheDocument();
  });

  it("shows only name and university when viewed by another tutor", async () => {
    getTutor.mockResolvedValue(TUTOR);
    useAuthStore.setState({
      user: { id: "another-tutor-user", role: "tutor" },
      status: "authenticated",
    });
    renderPage();

    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
    expect(screen.getByText(/সাস্ট|SUST/)).toBeInTheDocument();
    expect(screen.getByText(mixed["profile.peerTutorTitle"])).toBeInTheDocument();
    expect(screen.queryByText(/I teach physics/)).not.toBeInTheDocument();
    expect(screen.queryByText("৳3,000–5,000")).not.toBeInTheDocument();
  });

  it("shows full profile and edit button on own tutor profile", async () => {
    getTutor.mockResolvedValue(TUTOR);
    useAuthStore.setState({
      user: { id: "tutor-user-1", role: "tutor", tutor_slug: "rahim-uddin-physics-math" },
      status: "authenticated",
    });
    renderPage();

    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
    expect(screen.getByText(mixed["profile.ownProfileTitle"])).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["profile.editProfile"] })).toBeInTheDocument();
    expect(screen.getByText(/I teach physics/)).toBeInTheDocument();
  });
});
