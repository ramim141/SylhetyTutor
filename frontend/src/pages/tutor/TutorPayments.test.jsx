import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TutorPayments from "./TutorPayments";
import { mixed } from "../../i18n";
import {
  getMyCommissions,
  getMyPayments,
  getPaymentInfo,
  payCommission,
} from "../../api/payments";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/payments", () => ({
  getMyCommissions: vi.fn(),
  getMyPayments: vi.fn(),
  getPaymentInfo: vi.fn(),
  payCommission: vi.fn(),
}));

const commission = (overrides) => ({
  id: "c1",
  amount: 500,
  due_date: "2026-10-25",
  status: "pending",
  note: "",
  area: { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
  demo_at: "2026-10-10T10:00:00+06:00",
  overdue: false,
  payment: null,
  created_at: "2026-10-18T10:00:00+06:00",
  ...overrides,
});

function renderPage() {
  return render(
    <MemoryRouter>
      <TutorPayments />
    </MemoryRouter>,
  );
}

describe("TutorPayments page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({ user: { full_name: "Nusrat", role: "tutor" }, status: "authenticated" });
    getMyPayments.mockResolvedValue([]);
    getPaymentInfo.mockResolvedValue({ number: "01700000000", commission_amount: 500 });
    getMyCommissions.mockResolvedValue({ suspended: false, results: [commission()] });
  });

  it("shows what is due and pays it with the TrxID and sender number", async () => {
    payCommission.mockResolvedValue({ id: "p1", status: "pending" });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: mixed["pay.action.pay"].replace("{amount}", "500") }),
    );
    const dialog = screen.getByRole("dialog");
    // the tutor is told exactly where and how much to send
    expect(within(dialog).getByText(/01700000000/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(mixed["pay.dialog.trx"]), " 8n7a6d5ee1 ");
    await user.type(within(dialog).getByLabelText(mixed["pay.dialog.sender"]), "01733333333");
    await user.click(within(dialog).getByRole("button", { name: mixed["pay.dialog.send"] }));

    await waitFor(() =>
      expect(payCommission).toHaveBeenCalledWith("c1", {
        transaction_id: "8n7a6d5ee1",
        sender_number: "01733333333",
      }),
    );
    expect(await screen.findByText(mixed["pay.sent"])).toBeInTheDocument();
    await waitFor(() => expect(getMyCommissions).toHaveBeenCalledTimes(2));
  });

  it("explains a TrxID that was already used and keeps the dialog open", async () => {
    payCommission.mockRejectedValue({
      response: { status: 409, data: { code: "trx_already_used", detail: "x" } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /দিন/ }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(mixed["pay.dialog.trx"]), "8N7A6D5EE1");
    await user.type(within(dialog).getByLabelText(mixed["pay.dialog.sender"]), "01733333333");
    await user.click(within(dialog).getByRole("button", { name: mixed["pay.dialog.send"] }));

    expect(await within(dialog).findByText(mixed["error.trx_already_used"])).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows field errors next to the field", async () => {
    payCommission.mockRejectedValue({
      response: {
        status: 400,
        data: { code: "validation_error", fields: { sender_number: [{ code: "blank", message: "x" }] } },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /দিন/ }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: mixed["pay.dialog.send"] }),
    );
    expect(await screen.findByText(mixed["error.sender_number.blank"])).toBeInTheDocument();
  });

  it("does not offer to pay again while a payment is being verified", async () => {
    getMyCommissions.mockResolvedValue({
      suspended: false,
      results: [commission({ payment: { status: "pending", reject_reason: "" } })],
    });
    renderPage();

    expect(await screen.findByText(mixed["pay.payment.pending"])).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /দিন/ })).not.toBeInTheDocument();
  });

  it("shows why a payment was rejected and offers to pay again", async () => {
    getMyCommissions.mockResolvedValue({
      suspended: false,
      results: [commission({ payment: { status: "rejected", reject_reason: "Amount does not match" } })],
    });
    renderPage();

    expect(await screen.findByText(/Amount does not match/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: mixed["pay.action.payAgain"] })).toBeInTheDocument();
  });

  it("marks an overdue commission and shows the paused-applying warning", async () => {
    getMyCommissions.mockResolvedValue({
      suspended: true,
      results: [commission({ overdue: true })],
    });
    renderPage();

    expect(await screen.findByText(mixed["pay.suspended.title"])).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mixed["pay.commission.overdue"]))).toBeInTheDocument();
  });

  it("shows paid and waived ones without a pay button", async () => {
    getMyCommissions.mockResolvedValue({
      suspended: false,
      results: [commission({ id: "a", status: "paid" }), commission({ id: "b", status: "waived" })],
    });
    renderPage();

    expect(await screen.findByText(mixed["pay.status.paid"])).toBeInTheDocument();
    expect(screen.getByText(mixed["pay.status.waived"])).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /দিন/ })).not.toBeInTheDocument();
  });

  it("has an honest empty state, a history, and an error with retry", async () => {
    getMyCommissions.mockResolvedValue({ suspended: false, results: [] });
    getMyPayments.mockResolvedValue([
      {
        id: "p1",
        purpose: "unlock",
        amount: 150,
        transaction_id: "ABC12345XY",
        status: "verified",
        reject_reason: "",
        created_at: "2026-10-12T10:00:00+06:00",
      },
    ]);
    const { unmount } = renderPage();
    expect(await screen.findByText(mixed["pay.commissions.empty"])).toBeInTheDocument();
    expect(screen.getByText(/ABC12345XY/)).toBeInTheDocument();
    expect(screen.getByText(mixed["pay.payStatus.verified"])).toBeInTheDocument();
    unmount();

    getMyCommissions.mockRejectedValueOnce(new Error("network"));
    renderPage();
    expect(await screen.findByText(mixed["pay.loadFailed"])).toBeInTheDocument();
  });
});
