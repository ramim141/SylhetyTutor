import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TutorApplications from "./TutorApplications";
import { mixed } from "../../i18n";
import userEvent from "@testing-library/user-event";
import { getMyApplications } from "../../api/applications";
import { getPaymentInfo, payUnlock } from "../../api/payments";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/applications", () => ({ getMyApplications: vi.fn() }));
vi.mock("../../api/payments", () => ({ getPaymentInfo: vi.fn(), payUnlock: vi.fn() }));

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
  payment: null,
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

  it("lets the tutor pay a waiting unlock fee by bKash and then shows it is being verified", async () => {
    getPaymentInfo.mockResolvedValue({ number: "01700000000" });
    payUnlock.mockResolvedValue({ id: "p1", status: "pending" });
    getMyApplications.mockResolvedValueOnce([
      application({ status: "shortlisted", demo_at: "2026-10-20T11:00:00+06:00", unlock_fee: 150 }),
    ]);
    getMyApplications.mockResolvedValueOnce([
      application({
        status: "shortlisted",
        demo_at: "2026-10-20T11:00:00+06:00",
        unlock_fee: 150,
        payment: { status: "pending", reject_reason: "" },
      }),
    ]);
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByText(mixed["app.unlock.pending"].replace("{fee}", "150")),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ফোন করুন/ })).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: mixed["app.unlock.pay"].replace("{fee}", "150") }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/01700000000/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(mixed["pay.dialog.trx"]), "8N7A6D5EE1");
    await user.type(within(dialog).getByLabelText(mixed["pay.dialog.sender"]), "01733333333");
    await user.click(within(dialog).getByRole("button", { name: mixed["pay.dialog.send"] }));

    await waitFor(() =>
      expect(payUnlock).toHaveBeenCalledWith("a1", {
        transaction_id: "8N7A6D5EE1",
        sender_number: "01733333333",
      }),
    );
    expect(await screen.findByText(mixed["app.unlock.verifying"])).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /দিন/ })).not.toBeInTheDocument();
  });

  it("shows why an unlock payment was rejected and lets the tutor pay again", async () => {
    getMyApplications.mockResolvedValue([
      application({
        status: "shortlisted",
        demo_at: "2026-10-20T11:00:00+06:00",
        unlock_fee: 150,
        payment: { status: "rejected", reject_reason: "TrxID not found in bKash" },
      }),
    ]);
    renderPage();

    expect(await screen.findByText(/TrxID not found in bKash/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /দিন/ })).toBeInTheDocument();
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
