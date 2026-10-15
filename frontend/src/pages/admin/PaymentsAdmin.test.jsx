import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PaymentsAdmin from "./PaymentsAdmin";
import { mixed } from "../../i18n";
import {
  answerCall,
  getAdminCommissions,
  getAdminPayments,
  getCallList,
  markCommissionPaid,
  rejectPayment,
  verifyPayment,
  waiveCommission,
} from "../../api/admin";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/admin", () => ({
  getAdminPayments: vi.fn(),
  verifyPayment: vi.fn(),
  rejectPayment: vi.fn(),
  getAdminCommissions: vi.fn(),
  markCommissionPaid: vi.fn(),
  waiveCommission: vi.fn(),
  getCallList: vi.fn(),
  answerCall: vi.fn(),
}));

const payment = (overrides) => ({
  id: "p1",
  purpose: "unlock",
  amount: 150,
  sender_number: "01733333333",
  transaction_id: "8N7A6D5EE1",
  status: "pending",
  reject_reason: "",
  created_at: "2026-10-12T10:00:00+06:00",
  tutor_name: "Rahim Uddin",
  tutor_phone: "01722222222",
  ...overrides,
});

const commission = (overrides) => ({
  id: "c1",
  amount: 500,
  due_date: "2026-10-25",
  status: "pending",
  overdue: false,
  suspended: false,
  note: "",
  payment: null,
  tutor_name: "Rahim Uddin",
  tutor_phone: "01722222222",
  ...overrides,
});

const call = {
  id: "m1",
  guardian_name: "Karim Guardian",
  guardian_phone: "01711111111",
  tutor_name: "Rahim Uddin",
  area: "Amberkhana",
  demo_at: "2026-10-01T10:00:00+06:00",
  whatsapp_url: "https://wa.me/8801711111111",
};

function renderPage(path = "/admin/payments") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PaymentsAdmin />
    </MemoryRouter>,
  );
}

describe("PaymentsAdmin page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({ user: { full_name: "Admin", role: "admin" }, status: "authenticated" });
    getAdminPayments.mockResolvedValue({
      counts: { pending: 1, verified: 0, rejected: 0 },
      results: [payment()],
    });
  });

  it("lists pending payments with the TrxID and sender, and verifies one", async () => {
    verifyPayment.mockResolvedValue(payment({ status: "verified" }));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/8N7A6D5EE1/)).toBeInTheDocument();
    expect(screen.getByText(/01733333333/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: mixed["admin.pay.verify"] }));
    await waitFor(() => expect(verifyPayment).toHaveBeenCalledWith("p1"));
    await waitFor(() => expect(getAdminPayments).toHaveBeenCalledTimes(2));
  });

  it("rejects only with a reason of at least 5 characters", async () => {
    rejectPayment.mockResolvedValue(payment({ status: "rejected" }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["admin.pay.reject"] }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(mixed["admin.pay.reason"]), "no");
    await user.click(within(dialog).getByRole("button", { name: mixed["admin.pay.confirm"] }));
    expect(await within(dialog).findByText(mixed["error.reason_too_short"])).toBeInTheDocument();
    expect(rejectPayment).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(mixed["admin.pay.reason"]), "TrxID not found");
    await user.click(within(dialog).getByRole("button", { name: mixed["admin.pay.confirm"] }));
    await waitFor(() => expect(rejectPayment).toHaveBeenCalledWith("p1", "noTrxID not found"));
  });

  it("shows the commission tracker, marks paid and waives with a reason", async () => {
    getAdminCommissions.mockResolvedValue({
      counts: { pending: 2, paid: 0, waived: 0 },
      results: [commission(), commission({ id: "c2", overdue: true, suspended: true })],
    });
    markCommissionPaid.mockResolvedValue(commission({ status: "paid" }));
    waiveCommission.mockResolvedValue(commission({ status: "waived" }));
    const user = userEvent.setup();
    renderPage("/admin/payments?tab=commissions");

    expect(await screen.findAllByText(/Rahim Uddin/)).toHaveLength(2);
    expect(screen.getByText(mixed["admin.pay.suspended"])).toBeInTheDocument();
    expect(screen.getAllByText(mixed["pay.commission.overdue"]).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: mixed["admin.pay.markPaid"] })[0]);
    await waitFor(() => expect(markCommissionPaid).toHaveBeenCalledWith("c1"));

    await user.click(screen.getAllByRole("button", { name: mixed["admin.pay.waive"] })[1]);
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(mixed["admin.pay.reason"]), "Dispute settled");
    await user.click(within(dialog).getByRole("button", { name: mixed["admin.pay.confirm"] }));
    await waitFor(() => expect(waiveCommission).toHaveBeenCalledWith("c2", "Dispute settled"));
  });

  it("shows the call list with phone and WhatsApp links and records the answer", async () => {
    getCallList.mockResolvedValue([call]);
    answerCall.mockResolvedValue({ id: "m1", answered: true });
    const user = userEvent.setup();
    renderPage("/admin/payments?tab=calls");

    expect(await screen.findByRole("link", { name: /01711111111/ })).toHaveAttribute(
      "href",
      "tel:01711111111",
    );
    expect(screen.getByRole("link", { name: mixed["admin.calls.whatsapp"] })).toHaveAttribute(
      "href",
      "https://wa.me/8801711111111",
    );
    await user.click(screen.getByRole("button", { name: mixed["admin.calls.yes"] }));
    await waitFor(() => expect(answerCall).toHaveBeenCalledWith("m1", "yes"));
  });

  it("has honest empty states and an error with retry", async () => {
    getAdminPayments.mockResolvedValueOnce({ counts: { pending: 0 }, results: [] });
    const { unmount } = renderPage();
    expect(await screen.findByText(mixed["admin.pay.empty"])).toBeInTheDocument();
    unmount();

    getCallList.mockResolvedValueOnce([]);
    const second = renderPage("/admin/payments?tab=calls");
    expect(await screen.findByText(mixed["admin.calls.empty"])).toBeInTheDocument();
    second.unmount();

    getAdminPayments.mockRejectedValueOnce(new Error("network"));
    renderPage();
    expect(await screen.findByText(mixed["admin.pay.loadFailed"])).toBeInTheDocument();
  });

  it("explains a payment someone else already decided", async () => {
    verifyPayment.mockRejectedValue({
      response: { status: 409, data: { code: "not_pending", detail: "x" } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["admin.pay.verify"] }));
    expect(await screen.findByText(mixed["error.not_pending"])).toBeInTheDocument();
  });
});
