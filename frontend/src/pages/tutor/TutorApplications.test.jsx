import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TutorApplications from "./TutorApplications";
import { mixed } from "../../i18n";
import { getMyApplications } from "../../api/applications";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/applications", () => ({ getMyApplications: vi.fn() }));

const requirement = {
  id: "r1",
  class_level: { slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" },
  area: { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
  subjects: [{ slug: "math", name_en: "Math", name_bn: "গণিত" }],
  budget_min: 3000,
  budget_max: 5000,
  preferred_gender: "any",
  schedule_note: "",
};

const application = (overrides) => ({
  id: "a1",
  status: "applied",
  message: "",
  created_at: "2026-10-12T10:00:00+06:00",
  requirement,
  demo_at: null,
  unlock_fee: null,
  contact: null,
  ...overrides,
});

function renderPage() {
  return render(
    <MemoryRouter>
      <TutorApplications />
    </MemoryRouter>,
  );
}

describe("TutorApplications page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({ user: { full_name: "Nusrat", role: "tutor" }, status: "authenticated" });
  });

  it("lists applications with their status and no contact before a demo", async () => {
    getMyApplications.mockResolvedValue([
      application({ message: "I teach HSC math" }),
      application({ id: "a2", status: "shortlisted" }),
    ]);
    renderPage();

    expect(await screen.findAllByText(/এইচএসসি · গণিত/)).toHaveLength(2);
    expect(screen.getByText(mixed["app.status.applied"])).toBeInTheDocument();
    expect(screen.getByText(mixed["app.status.shortlisted"])).toBeInTheDocument();
    expect(screen.getByText(/I teach HSC math/)).toBeInTheDocument();
    // a shortlisted tutor is told contact is not open yet
    expect(screen.getByText(mixed["app.contact.closed"])).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ফোন করুন/ })).not.toBeInTheDocument();
  });

  it("shows the demo time and the guardian's number once the API sends it", async () => {
    getMyApplications.mockResolvedValue([
      application({
        status: "shortlisted",
        demo_at: "2026-10-20T11:00:00+06:00",
        contact: { name: "Karim", phone: "01711111111", email: null },
      }),
    ]);
    renderPage();

    const call = await screen.findByRole("link", { name: /Karim কে ফোন করুন/ });
    expect(call).toHaveAttribute("href", "tel:01711111111");
    expect(screen.getByText(/Demo class:/)).toBeInTheDocument();
    expect(screen.queryByText(mixed["app.contact.closed"])).not.toBeInTheDocument();
  });

  it("explains a demo that waits for the unlock fee, without a number", async () => {
    getMyApplications.mockResolvedValue([
      application({ status: "shortlisted", demo_at: "2026-10-20T11:00:00+06:00", unlock_fee: 150 }),
    ]);
    renderPage();

    expect(
      await screen.findByText(mixed["app.unlock.pending"].replace("{fee}", "150")),
    ).toBeInTheDocument();
  });

  it("shows an empty state that leads to tuition, and an error with retry", async () => {
    getMyApplications.mockResolvedValueOnce([]);
    const { unmount } = renderPage();
    expect(await screen.findByText(mixed["app.mine.empty"])).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["app.mine.find"] })).toHaveAttribute(
      "href",
      "/tutor/requirements",
    );
    unmount();

    getMyApplications.mockRejectedValueOnce(new Error("network"));
    renderPage();
    expect(await screen.findByText(mixed["app.mine.loadFailed"])).toBeInTheDocument();
  });
});
