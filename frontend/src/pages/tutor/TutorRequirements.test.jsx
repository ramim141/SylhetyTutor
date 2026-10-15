import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TutorRequirements from "./TutorRequirements";
import { mixed } from "../../i18n";
import { getMatchingRequirements } from "../../api/requirements";
import { applyToRequirement } from "../../api/applications";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/requirements", () => ({ getMatchingRequirements: vi.fn() }));
vi.mock("../../api/applications", () => ({ applyToRequirement: vi.fn() }));

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
  application_status: null,
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

  it("sends an application with the note and then shows 'applied'", async () => {
    getMatchingRequirements.mockResolvedValue({ results: [match()] });
    applyToRequirement.mockResolvedValue({ id: "a1", status: "applied" });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["app.apply"] }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(mixed["app.dialog.label"]), "I teach HSC math");
    await user.click(within(dialog).getByRole("button", { name: mixed["app.dialog.send"] }));

    await waitFor(() => expect(applyToRequirement).toHaveBeenCalledWith("r1", "I teach HSC math"));
    expect(await screen.findByText(mixed["app.sent"])).toBeInTheDocument();
    expect(screen.getByText(mixed["app.applied"])).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: mixed["app.apply"] })).not.toBeInTheDocument();
  });

  it("does not offer Apply again on a requirement already applied to", async () => {
    getMatchingRequirements.mockResolvedValue({ results: [match({ application_status: "viewed" })] });
    renderPage();

    expect(await screen.findByText(mixed["app.applied"])).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: mixed["app.apply"] })).not.toBeInTheDocument();
  });

  it("shows the contact warning next to the note field and keeps the dialog open", async () => {
    getMatchingRequirements.mockResolvedValue({ results: [match()] });
    applyToRequirement.mockRejectedValue({
      response: {
        status: 400,
        data: { code: "validation_error", fields: { message: [{ code: "contact_not_allowed", message: "x" }] } },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["app.apply"] }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(mixed["app.dialog.label"]), "call me");
    await user.click(within(dialog).getByRole("button", { name: mixed["app.dialog.send"] }));

    expect(await within(dialog).findByText(mixed["error.message.contact_not_allowed"])).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("explains an 'already applied' answer from the server", async () => {
    getMatchingRequirements.mockResolvedValue({ results: [match()] });
    applyToRequirement.mockRejectedValue({
      response: { status: 409, data: { code: "already_applied", detail: "x" } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["app.apply"] }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: mixed["app.dialog.send"] }),
    );
    expect(await screen.findByText(mixed["error.already_applied"])).toBeInTheDocument();
  });
});
