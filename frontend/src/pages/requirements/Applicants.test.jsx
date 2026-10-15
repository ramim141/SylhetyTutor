import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Applicants from "./Applicants";
import { mixed } from "../../i18n";
import {
  bookDemo,
  getApplicants,
  rejectApplication,
  shortlistApplication,
} from "../../api/applications";
import { getRequirement } from "../../api/requirements";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/applications", () => ({
  getApplicants: vi.fn(),
  shortlistApplication: vi.fn(),
  rejectApplication: vi.fn(),
  bookDemo: vi.fn(),
}));
vi.mock("../../api/requirements", () => ({ getRequirement: vi.fn() }));

const requirement = {
  id: "r1",
  class_level: { slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" },
  area: { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
  subjects: [{ slug: "math", name_en: "Math", name_bn: "গণিত" }],
};

const applicant = (overrides) => ({
  id: "a1",
  status: "viewed",
  message: "I teach HSC math",
  created_at: "2026-10-12T10:00:00+06:00",
  demo_at: null,
  unlock_fee: null,
  contact: null,
  tutor: {
    slug: "rahim-uddin",
    name: "Rahim Uddin",
    initials: "RU",
    avatarUrl: null,
    university: { slug: "sust", name_en: "SUST", name_bn: "শাবিপ্রবি", short_name: "SUST" },
    department: "CSE",
    area: { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
    subjects: [{ slug: "math", name_en: "Math", name_bn: "গণিত" }],
    feeMin: 2000,
    feeMax: 4000,
    isVerified: true,
  },
  ...overrides,
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/requirements/r1/applicants"]}>
      <Routes>
        <Route path="/requirements/:id/applicants" element={<Applicants />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Applicants page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({ user: { full_name: "Karim", role: "guardian" }, status: "authenticated" });
    getRequirement.mockResolvedValue(requirement);
  });

  it("shows each applicant with their note and no phone number", async () => {
    getApplicants.mockResolvedValue([applicant()]);
    renderPage();

    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
    expect(screen.getByText("I teach HSC math")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["app.applicants.profile"] })).toHaveAttribute(
      "href",
      "/tutors/rahim-uddin",
    );
    expect(screen.queryByRole("link", { name: /ফোন করুন/ })).not.toBeInTheDocument();
  });

  it("has an honest empty state and an error with retry", async () => {
    getApplicants.mockResolvedValueOnce([]);
    const { unmount } = renderPage();
    expect(await screen.findByText(mixed["app.applicants.empty"])).toBeInTheDocument();
    unmount();

    getApplicants.mockRejectedValueOnce(new Error("network"));
    renderPage();
    expect(await screen.findByText(mixed["app.applicants.loadFailed"])).toBeInTheDocument();
  });

  it("shortlists an applicant and then offers to book the demo", async () => {
    getApplicants.mockResolvedValue([applicant()]);
    shortlistApplication.mockResolvedValue(applicant({ status: "shortlisted" }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["app.action.shortlist"] }));
    await waitFor(() => expect(shortlistApplication).toHaveBeenCalledWith("a1"));
    expect(await screen.findByText(mixed["app.decision.shortlisted"])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: mixed["app.action.bookDemo"] })).toBeInTheDocument();
  });

  it("rejects an applicant", async () => {
    getApplicants.mockResolvedValue([applicant()]);
    rejectApplication.mockResolvedValue(applicant({ status: "rejected" }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["app.action.reject"] }));
    await waitFor(() => expect(rejectApplication).toHaveBeenCalledWith("a1"));
    expect(await screen.findByText(mixed["app.decision.rejected"])).toBeInTheDocument();
  });

  it("books a demo and then shows the tutor's number", async () => {
    getApplicants.mockResolvedValue([applicant({ status: "shortlisted" })]);
    bookDemo.mockResolvedValue(
      applicant({
        status: "shortlisted",
        demo_at: "2026-10-20T11:00:00+06:00",
        contact: { name: "Rahim Uddin", phone: "01722222222", email: null },
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["app.action.bookDemo"] }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: mixed["app.book.confirm"] }));

    await waitFor(() => expect(bookDemo).toHaveBeenCalledTimes(1));
    const [id, when] = bookDemo.mock.calls[0];
    expect(id).toBe("a1");
    expect(new Date(when).getTime()).toBeGreaterThan(Date.now());
    expect(await screen.findByText(mixed["app.book.done"])).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rahim Uddin কে ফোন করুন/ })).toHaveAttribute(
      "href",
      "tel:01722222222",
    );
    expect(screen.getByRole("button", { name: mixed["app.action.moveDemo"] })).toBeInTheDocument();
  });

  it("keeps the dialog open and explains a time the server refuses", async () => {
    getApplicants.mockResolvedValue([applicant({ status: "shortlisted" })]);
    bookDemo.mockRejectedValue({
      response: { status: 400, data: { code: "invalid_demo_time", detail: "x" } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["app.action.bookDemo"] }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: mixed["app.book.confirm"] }),
    );
    expect(await screen.findByText(mixed["error.invalid_demo_time"])).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("says a booked demo is waiting for the unlock fee instead of showing a number", async () => {
    getApplicants.mockResolvedValue([
      applicant({ status: "shortlisted", demo_at: "2026-10-20T11:00:00+06:00", unlock_fee: 150 }),
    ]);
    renderPage();

    expect(
      await screen.findByText(mixed["app.unlock.pending"].replace("{fee}", "150")),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ফোন করুন/ })).not.toBeInTheDocument();
  });
});
