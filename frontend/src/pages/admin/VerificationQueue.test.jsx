import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VerificationQueue from "./VerificationQueue";
import { mixed } from "../../i18n";
import { getApprovals } from "../../api/admin";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/admin", () => ({ getApprovals: vi.fn() }));

const row = (id, name, extra = {}) => ({
  id,
  full_name: name,
  university: "SUST",
  department: "CSE",
  status: "pending",
  submitted_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  fee_min: 4000,
  fee_max: 6000,
  areas: ["amberkhana"],
  has_all_documents: true,
  ...extra,
});

const counts = { pending: 2, approved: 1, rejected: 0 };

function renderQueue(entry = "/admin/verification", state) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: entry.split("?")[0],
          search: entry.split("?")[1] ? `?${entry.split("?")[1]}` : "",
          state,
        },
      ]}
    >
      <Routes>
        <Route path="/admin/verification" element={<VerificationQueue />} />
        <Route path="/admin/verification/:id" element={<div>Detail Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("VerificationQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
  });

  it("lists pending profiles with tab numbers and opens one", async () => {
    getApprovals.mockResolvedValue({
      results: [row("a", "Rahim Uddin"), row("b", "Nusrat Jahan", { has_all_documents: false })],
      counts,
      next: null,
    });
    const user = userEvent.setup();
    renderQueue();

    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
    expect(getApprovals).toHaveBeenCalledWith({ status: "pending", page: 1 }, expect.any(Object));
    expect(screen.getByRole("tab", { name: /Pending.*\(2\)/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByText(mixed["admin.queue.docsMissing"])).toHaveLength(1);

    await user.click(screen.getByRole("link", { name: /Rahim Uddin/ }));
    expect(screen.getByText("Detail Page")).toBeInTheDocument();
  });

  it("switches tab and asks for that status", async () => {
    getApprovals.mockResolvedValue({ results: [], counts, next: null });
    const user = userEvent.setup();
    renderQueue();
    await screen.findByText(mixed["admin.queue.empty.pending"]);

    await user.click(screen.getByRole("tab", { name: /Rejected/ }));

    expect(await screen.findByText(mixed["admin.queue.empty.rejected"])).toBeInTheDocument();
    expect(getApprovals).toHaveBeenLastCalledWith(
      { status: "rejected", page: 1 },
      expect.any(Object),
    );
  });

  it("reads the tab from the address, so a shared link opens the same list", async () => {
    getApprovals.mockResolvedValue({ results: [], counts, next: null });
    renderQueue("/admin/verification?status=approved");
    await screen.findByText(mixed["admin.queue.empty.approved"]);
    expect(getApprovals).toHaveBeenCalledWith({ status: "approved", page: 1 }, expect.any(Object));
  });

  it("shows an error with retry, then the list", async () => {
    getApprovals.mockRejectedValueOnce(new Error("network"));
    getApprovals.mockResolvedValueOnce({ results: [row("a", "Rahim Uddin")], counts, next: null });
    const user = userEvent.setup();
    renderQueue();

    await user.click(await screen.findByRole("button", { name: mixed["common.retry"] }));
    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
  });

  it("pages forward when there is a next page", async () => {
    getApprovals.mockResolvedValue({ results: [row("a", "Rahim Uddin")], counts, next: "x" });
    const user = userEvent.setup();
    renderQueue();

    await user.click(await screen.findByRole("button", { name: mixed["search.next"] }));
    expect(getApprovals).toHaveBeenLastCalledWith(
      { status: "pending", page: 2 },
      expect.any(Object),
    );
  });

  it("confirms the last decision and that the queue is clear", async () => {
    getApprovals.mockResolvedValue({
      results: [],
      counts: { pending: 0, approved: 3, rejected: 0 },
      next: null,
    });
    renderQueue("/admin/verification", { flash: "approved", cleared: true });
    expect(await screen.findByText(new RegExp(mixed["admin.result.approved"]))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mixed["admin.queue.cleared"]))).toBeInTheDocument();
  });
});
