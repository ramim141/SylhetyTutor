import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VerificationDetail from "./VerificationDetail";
import { mixed } from "../../i18n";
import { approveProfile, getApproval, getApprovals, rejectProfile } from "../../api/admin";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/admin", () => ({
  getApproval: vi.fn(),
  getApprovals: vi.fn(),
  approveProfile: vi.fn(),
  rejectProfile: vi.fn(),
  getDocumentBlob: vi.fn(() => new Promise(() => {})), // scans stay "loading": not under test here
}));

const lookup = (slug, en, bn) => ({ slug, name_en: en, name_bn: bn });

const detail = (extra = {}) => ({
  id: "p1",
  status: "pending",
  submitted_at: new Date(Date.now() - 3600000).toISOString(),
  rejection_reason: "",
  user: { full_name: "Rahim Uddin", phone: "01712345678", email: null },
  profile: {
    gender: "male",
    university: {
      ...lookup("sust", "Shahjalal University", "শাহজালাল বিশ্ববিদ্যালয়"),
      short_name: "SUST",
    },
    department: "CSE",
    year: "3rd Year",
    student_id_number: "2021331001",
    bio: "I teach physics.",
    fee_min: 4000,
    fee_max: 6000,
    subjects: [lookup("physics", "Physics", "পদার্থবিজ্ঞান")],
    class_levels: [lookup("hsc", "HSC", "এইচএসসি")],
    areas: [lookup("amberkhana", "Amberkhana", "আম্বরখানা")],
    availability: [],
  },
  documents: [
    { kind: "nid", url: "/api/v1/tutors/documents/p1/nid/" },
    { kind: "student_id", url: "/api/v1/tutors/documents/p1/student_id/" },
  ],
  missing_fields: [],
  can_approve: true,
  history: [
    { action: "submitted", actor: "Rahim Uddin", reason: "", at: new Date().toISOString() },
  ],
  ...extra,
});

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/admin/verification/p1"]}>
      <Routes>
        <Route path="/admin/verification/:id" element={<VerificationDetail />} />
        <Route path="/admin/verification" element={<div>Queue Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const tick = async (user) => {
  for (const name of ["name", "university", "clear"]) {
    await user.click(screen.getByRole("checkbox", { name: mixed[`admin.check.${name}`] }));
  }
};

const apiError = (status, data) => Object.assign(new Error("api"), { response: { status, data } });

describe("VerificationDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    getApproval.mockResolvedValue(detail());
    getApprovals.mockResolvedValue({ results: [], counts: {}, next: null });
  });

  it("shows what the admin needs, contact included", async () => {
    renderDetail();
    expect(await screen.findByRole("heading", { name: "Rahim Uddin" })).toBeInTheDocument();
    expect(screen.getByText("01712345678")).toBeInTheDocument();
    expect(screen.getByText("2021331001")).toBeInTheDocument();
    expect(screen.getByText("৳4000–6000")).toBeInTheDocument();
    expect(screen.getByText("শাহজালাল বিশ্ববিদ্যালয়")).toBeInTheDocument();
  });

  it("keeps Approve off until all three checks are ticked", async () => {
    const user = userEvent.setup();
    renderDetail();
    const approve = await screen.findByRole("button", { name: mixed["admin.approve"] });
    expect(approve).toBeDisabled();

    await tick(user);
    expect(approve).toBeEnabled();
  });

  it("does not offer Approve for a profile the server says is incomplete", async () => {
    getApproval.mockResolvedValue(detail({ can_approve: false, missing_fields: ["fee_min"] }));
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "Rahim Uddin" });
    await tick(user);

    expect(screen.getByRole("button", { name: mixed["admin.approve"] })).toBeDisabled();
    expect(screen.getByText(mixed["admin.incomplete"])).toBeInTheDocument();
  });

  it("approves after confirmation and goes to the next waiting profile", async () => {
    approveProfile.mockResolvedValue({});
    getApprovals.mockResolvedValue({ results: [{ id: "p2" }], counts: {}, next: null });
    getApproval.mockResolvedValueOnce(detail()).mockResolvedValueOnce(detail({ id: "p2" }));
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "Rahim Uddin" });
    await tick(user);

    await user.click(screen.getByRole("button", { name: mixed["admin.approve"] }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(mixed["admin.approve.confirmBody"])).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: mixed["admin.approve"] }));

    expect(approveProfile).toHaveBeenCalledWith("p1");
    expect(await screen.findByText(mixed["admin.result.approved"])).toBeInTheDocument();
    // The banner can show a moment before the next profile is requested
    await waitFor(() => expect(getApproval).toHaveBeenLastCalledWith("p2", expect.any(Object)));
  });

  it("goes back to the queue when nothing else is waiting", async () => {
    approveProfile.mockResolvedValue({});
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "Rahim Uddin" });
    await tick(user);
    await user.click(screen.getByRole("button", { name: mixed["admin.approve"] }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: mixed["admin.approve"] }),
    );

    expect(await screen.findByText("Queue Page")).toBeInTheDocument();
  });

  it("explains when another admin decided first, and can reload", async () => {
    approveProfile.mockRejectedValue(apiError(409, { code: "not_pending", detail: "x" }));
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "Rahim Uddin" });
    await tick(user);
    await user.click(screen.getByRole("button", { name: mixed["admin.approve"] }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: mixed["admin.approve"] }),
    );

    expect(await screen.findByText(mixed["admin.notPending"])).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: mixed["common.retry"] }));
    expect(getApproval).toHaveBeenCalledTimes(2);
  });

  it("rejects with a reason picked from a chip and edited", async () => {
    rejectProfile.mockResolvedValue({});
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "Rahim Uddin" });

    await user.click(screen.getByRole("button", { name: mixed["admin.reject"] }));
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: mixed["admin.reject.chipLabel.nid"] }),
    );
    expect(within(dialog).getByRole("textbox")).toHaveValue(mixed["admin.reject.chip.nid"]);
    await user.click(within(dialog).getByRole("button", { name: mixed["admin.reject.submit"] }));

    expect(rejectProfile).toHaveBeenCalledWith("p1", mixed["admin.reject.chip.nid"]);
  });

  it("does not send a reason that is too short", async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "Rahim Uddin" });

    await user.click(screen.getByRole("button", { name: mixed["admin.reject"] }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByRole("textbox"), "bad");
    await user.click(within(dialog).getByRole("button", { name: mixed["admin.reject.submit"] }));

    expect(rejectProfile).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(mixed["error.reason.too_short"]);
  });

  it("shows the server's reason error next to the box", async () => {
    rejectProfile.mockRejectedValue(
      apiError(400, { code: "invalid", fields: { reason: [{ code: "too_long", message: "x" }] } }),
    );
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole("heading", { name: "Rahim Uddin" });
    await user.click(screen.getByRole("button", { name: mixed["admin.reject"] }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByRole("textbox"), "a long enough reason");
    await user.click(within(dialog).getByRole("button", { name: mixed["admin.reject.submit"] }));

    expect(await within(dialog).findByText(mixed["error.reason.too_long"])).toBeInTheDocument();
  });

  it("is read-only for a profile that was already decided", async () => {
    getApproval.mockResolvedValue(
      detail({ status: "rejected", rejection_reason: "NID unclear, upload again." }),
    );
    renderDetail();
    expect(await screen.findByText("NID unclear, upload again.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: mixed["admin.approve"] })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: mixed["admin.reject"] })).not.toBeInTheDocument();
  });

  it("says so when the profile does not exist (or is only a draft)", async () => {
    getApproval.mockRejectedValue(apiError(404, { code: "not_found" }));
    renderDetail();
    expect(await screen.findByText(mixed["admin.detail.missing"])).toBeInTheDocument();
  });
});
