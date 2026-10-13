import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TutorStatusCard } from "./TutorStatusCard";
import { getMyProfile } from "../../api/tutors";
import { mixed } from "../../i18n";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/tutors", () => ({ getMyProfile: vi.fn() }));

const mine = (extra = {}) => ({
  status: "draft",
  slug: null,
  rejection_reason: "",
  submitted_at: null,
  missing: [],
  required_total: 13,
  ...extra,
});
const renderCard = () =>
  render(
    <MemoryRouter>
      <TutorStatusCard />
    </MemoryRouter>,
  );

describe("TutorStatusCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
  });

  it("invites a tutor who has done nothing to start, with no invented progress", async () => {
    getMyProfile.mockResolvedValue(mine({ missing: new Array(13).fill("x") }));
    renderCard();

    expect(await screen.findByText(mixed["tr.status.draft.title"])).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["tr.status.start"] })).toHaveAttribute(
      "href",
      "/tutor/profile",
    );
    expect(
      screen.getByText(
        mixed["tr.status.draft.progress"].replace("{done}", "0").replace("{total}", "13"),
      ),
    ).toBeInTheDocument();
  });

  it("shows how far a draft is and offers to continue", async () => {
    getMyProfile.mockResolvedValue(mine({ missing: new Array(8).fill("x") }));
    renderCard();

    expect(
      await screen.findByText(
        mixed["tr.status.draft.progress"].replace("{done}", "5").replace("{total}", "13"),
      ),
    ).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: mixed["tr.progress"] });
    expect(bar).toHaveAttribute("aria-valuenow", "5");
    expect(bar).toHaveAttribute("aria-valuemax", "13");
    expect(screen.getByRole("link", { name: mixed["tr.status.continue"] })).toBeInTheDocument();
  });

  it("says a pending profile is being verified, with the date, and offers no editing", async () => {
    getMyProfile.mockResolvedValue(
      mine({ status: "pending", submitted_at: "2026-10-12T10:00:00+06:00" }),
    );
    renderCard();

    expect(await screen.findByText(mixed["tr.status.pending.title"])).toBeInTheDocument();
    expect(screen.getByText(mixed["tr.status.pending.body"])).toBeInTheDocument();
    expect(screen.getByText(/12 Oct 2026/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows the team's reason for a rejection and a way to fix it", async () => {
    getMyProfile.mockResolvedValue(
      mine({ status: "rejected", rejection_reason: "Student ID is unreadable" }),
    );
    renderCard();

    expect(await screen.findByText(mixed["tr.status.rejected.title"])).toBeInTheDocument();
    expect(screen.getByText("Student ID is unreadable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["tr.status.rejected.fix"] })).toHaveAttribute(
      "href",
      "/tutor/profile",
    );
  });

  it("links an approved tutor to their public page and to editing", async () => {
    getMyProfile.mockResolvedValue(mine({ status: "approved", slug: "rahim-uddin-physics" }));
    renderCard();

    expect(await screen.findByText(mixed["tr.status.approved.title"])).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["tr.status.view"] })).toHaveAttribute(
      "href",
      "/tutors/rahim-uddin-physics",
    );
    expect(screen.getByRole("link", { name: mixed["tr.status.edit"] })).toHaveAttribute(
      "href",
      "/tutor/profile",
    );
  });

  it("does not link to a public page that has no address yet", async () => {
    getMyProfile.mockResolvedValue(mine({ status: "approved", slug: null }));
    renderCard();

    await screen.findByText(mixed["tr.status.approved.title"]);
    expect(screen.queryByRole("link", { name: mixed["tr.status.view"] })).not.toBeInTheDocument();
  });

  it("offers a retry when the status cannot be loaded", async () => {
    getMyProfile.mockRejectedValueOnce(new Error("Network Error")).mockResolvedValueOnce(mine());
    renderCard();

    expect(await screen.findByText(mixed["tr.status.loadError"])).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: mixed["common.retry"] }));

    expect(await screen.findByText(mixed["tr.status.draft.title"])).toBeInTheDocument();
  });
});
