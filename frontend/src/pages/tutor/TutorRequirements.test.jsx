import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TutorRequirements from "./TutorRequirements";
import { mixed } from "../../i18n";
import { getMatchingRequirements } from "../../api/requirements";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/requirements", () => ({ getMatchingRequirements: vi.fn() }));

const match = (overrides) => ({
  id: "r1",
  class_level: { slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" },
  area: { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
  subjects: [{ slug: "math", name_en: "Math", name_bn: "গণিত" }],
  budget_min: 3000,
  budget_max: 5000,
  preferred_gender: "any",
  schedule_note: "Sun, Tue evening",
  published_at: new Date().toISOString(),
  budget_fits: true,
  ...overrides,
});

function renderPage() {
  return render(
    <MemoryRouter>
      <TutorRequirements />
    </MemoryRouter>,
  );
}

describe("TutorRequirements page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({
      user: { full_name: "Nusrat", role: "tutor" },
      status: "authenticated",
    });
  });

  it("lists matching requirements and says whether the budget fits", async () => {
    getMatchingRequirements.mockResolvedValue({
      results: [match(), match({ id: "r2", budget_fits: false })],
    });
    renderPage();

    expect(await screen.findAllByText(/এইচএসসি · গণিত/)).toHaveLength(2);
    expect(screen.getByText(mixed["match.fits"])).toBeInTheDocument();
    expect(screen.getByText(mixed["match.noFit"])).toBeInTheDocument();
    expect(screen.getAllByText(mixed["match.contactNote"])).toHaveLength(2);
    expect(screen.getAllByText("Sun, Tue evening")).toHaveLength(2);
  });

  it("shows why it is locked, with a way to the profile, when the tutor is not approved", async () => {
    getMatchingRequirements.mockRejectedValue({ response: { status: 403, data: {} } });
    renderPage();

    expect(await screen.findByText(mixed["match.locked.title"])).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["match.locked.cta"] })).toHaveAttribute(
      "href",
      "/tutor/profile",
    );
  });

  it("shows an honest empty state", async () => {
    getMatchingRequirements.mockResolvedValue({ results: [] });
    renderPage();
    expect(await screen.findByText(mixed["match.empty"])).toBeInTheDocument();
  });

  it("shows an error with a retry for network problems", async () => {
    getMatchingRequirements.mockRejectedValue(new Error("network"));
    renderPage();
    expect(await screen.findByText(mixed["match.loadFailed"])).toBeInTheDocument();
  });
});
