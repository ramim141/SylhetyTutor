import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MyRequirements from "./MyRequirements";
import { mixed } from "../../i18n";
import {
  closeRequirement,
  deleteRequirement,
  getMyRequirements,
  publishRequirement,
} from "../../api/requirements";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/requirements", () => ({
  getMyRequirements: vi.fn(),
  publishRequirement: vi.fn(),
  closeRequirement: vi.fn(),
  deleteRequirement: vi.fn(),
}));

const level = { slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" };
const area = { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" };
const math = { slug: "math", name_en: "Math", name_bn: "গণিত" };

function item(overrides) {
  return {
    id: "r1",
    status: "open",
    class_level: level,
    area,
    subjects: [math],
    budget_min: 3000,
    budget_max: 5000,
    preferred_gender: "any",
    schedule_note: "Sun, Tue evening",
    expires_at: "2026-11-10T10:00:00+06:00",
    expired: false,
    missing: [],
    application_count: 2,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyRequirements />
    </MemoryRouter>,
  );
}

describe("MyRequirements page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({
      user: { full_name: "Karim", role: "guardian" },
      status: "authenticated",
    });
  });

  it("shows each requirement with its status and the actions that fit it", async () => {
    getMyRequirements.mockResolvedValue([
      item({ id: "open1" }),
      item({ id: "draft1", status: "draft", expires_at: null }),
      item({ id: "old1", expired: true }),
      item({ id: "closed1", status: "closed", expires_at: null }),
    ]);
    renderPage();

    expect(await screen.findAllByText(/এইচএসসি · গণিত/)).toHaveLength(4);
    expect(screen.getByText(mixed["req.status.draft"])).toBeInTheDocument();
    expect(screen.getByText(mixed["req.status.expired"])).toBeInTheDocument();
    expect(screen.getByText(mixed["req.expiredNote"])).toBeInTheDocument();
    // Close only on the open one; publish on the draft, publish-again on closed and expired
    expect(screen.getAllByRole("button", { name: mixed["req.action.close"] })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: mixed["req.action.republish"] })).toHaveLength(2);
    expect(screen.getByRole("button", { name: mixed["req.action.delete"] })).toBeInTheDocument();
  });

  it("links an open requirement to its applicants, with the count", async () => {
    getMyRequirements.mockResolvedValue([item()]);
    renderPage();

    const link = await screen.findByRole("link", {
      name: mixed["req.action.applicants"].replace("{count}", "2"),
    });
    expect(link).toHaveAttribute("href", "/requirements/r1/applicants");
  });

  it("shows an honest empty state with a way to post", async () => {
    getMyRequirements.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(mixed["req.empty"])).toBeInTheDocument();
  });

  it("shows an error with a retry", async () => {
    getMyRequirements.mockRejectedValueOnce(new Error("network"));
    getMyRequirements.mockResolvedValueOnce([item()]);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(mixed["req.loadFailed"])).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: mixed["common.retry"] }));
    expect(await screen.findByText(/এইচএসসি · গণিত/)).toBeInTheDocument();
  });

  it("closes an open requirement with the reason the guardian picked", async () => {
    getMyRequirements.mockResolvedValue([item()]);
    closeRequirement.mockResolvedValue(item({ status: "closed" }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["req.action.close"] }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText(mixed["req.close.no_longer_needed"]));
    await user.click(within(dialog).getByRole("button", { name: mixed["req.close.confirm"] }));

    await waitFor(() => expect(closeRequirement).toHaveBeenCalledWith("r1", "no_longer_needed"));
    await waitFor(() => expect(getMyRequirements).toHaveBeenCalledTimes(2));
  });

  it("deletes a draft only after confirming", async () => {
    getMyRequirements.mockResolvedValue([item({ id: "d1", status: "draft", expires_at: null })]);
    deleteRequirement.mockResolvedValue();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["req.action.delete"] }));
    expect(deleteRequirement).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: mixed["req.delete.confirm"] }));
    await waitFor(() => expect(deleteRequirement).toHaveBeenCalledWith("d1"));
  });

  it("explains the limit in the guardian's language when publishing is refused", async () => {
    getMyRequirements.mockResolvedValue([item({ id: "d1", status: "draft", expires_at: null })]);
    publishRequirement.mockRejectedValue({
      response: { status: 409, data: { code: "too_many_open", detail: "x" } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["req.action.publish"] }));
    expect(await screen.findByText(mixed["error.too_many_open"])).toBeInTheDocument();
  });
});
