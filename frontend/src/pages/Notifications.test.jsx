import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Notifications from "./Notifications";
import { mixed } from "../i18n";
import { getNotifications, markAllRead, markRead } from "../api/notifications";
import { useAuthStore } from "../store/authStore";
import { useLanguageStore } from "../store/languageStore";
import { useNotificationStore } from "../store/notificationStore";

vi.mock("../api/notifications", () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

const approved = {
  id: "n1",
  kind: "profile_approved",
  data: {},
  created_at: "2026-10-12T10:00:00+06:00",
  read_at: null,
};
const rejected = {
  id: "n2",
  kind: "profile_rejected",
  data: { reason: "Student ID is unreadable" },
  created_at: "2026-10-11T10:00:00+06:00",
  read_at: "2026-10-11T11:00:00+06:00",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <Notifications />
    </MemoryRouter>,
  );
}

describe("Notifications page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({
      user: { full_name: "Nusrat", role: "tutor" },
      status: "authenticated",
    });
    useNotificationStore.setState({ unread: 0 });
  });

  it("shows each notification in the reader's language, with the rejection reason", async () => {
    getNotifications.mockResolvedValue({ results: [approved, rejected], unread_count: 1 });
    renderPage();

    expect(await screen.findByText(mixed["notif.profile_approved.title"])).toBeInTheDocument();
    expect(screen.getByText(/Student ID is unreadable/)).toBeInTheDocument();
    expect(useNotificationStore.getState().unread).toBe(1);
  });

  it("shows an honest empty state", async () => {
    getNotifications.mockResolvedValue({ results: [], unread_count: 0 });
    renderPage();
    expect(await screen.findByText(mixed["notif.empty"])).toBeInTheDocument();
  });

  it("shows an error with a retry when the server cannot be reached", async () => {
    getNotifications.mockRejectedValueOnce(new Error("network"));
    getNotifications.mockResolvedValueOnce({ results: [approved], unread_count: 1 });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(mixed["notif.loadFailed"])).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: mixed["common.retry"] }));
    expect(await screen.findByText(mixed["notif.profile_approved.title"])).toBeInTheDocument();
  });

  it("marks everything read and clears the bell", async () => {
    getNotifications.mockResolvedValue({ results: [approved], unread_count: 1 });
    markAllRead.mockResolvedValue({ updated: 1 });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["notif.markAll"] }));

    await waitFor(() => expect(useNotificationStore.getState().unread).toBe(0));
    expect(screen.queryByRole("button", { name: mixed["notif.markAll"] })).not.toBeInTheDocument();
  });

  it("opening an unread item marks it read", async () => {
    getNotifications.mockResolvedValue({ results: [approved], unread_count: 1 });
    markRead.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("link", { name: mixed["notif.profile_approved.cta"] }),
    );

    expect(markRead).toHaveBeenCalledWith("n1");
    expect(useNotificationStore.getState().unread).toBe(0);
  });

  it("opens the applicants list for a new application and says when the demo is", async () => {
    useAuthStore.setState({ user: { full_name: "Karim", role: "guardian" }, status: "authenticated" });
    getNotifications.mockResolvedValue({
      count: 2,
      unread_count: 2,
      next: null,
      results: [
        {
          id: "n3",
          kind: "application_received",
          data: { requirement_id: "r9" },
          created_at: "2026-10-12T10:00:00+06:00",
          read_at: null,
        },
        {
          id: "n4",
          kind: "demo_booked",
          data: { requirement_id: "r9", demo_at: "2026-10-20T11:00:00+06:00" },
          created_at: "2026-10-12T09:00:00+06:00",
          read_at: null,
        },
      ],
    });
    renderPage();

    expect(await screen.findByText(mixed["notif.application_received.title"])).toBeInTheDocument();
    expect(screen.getByText(mixed["notif.demo_booked.title"])).toBeInTheDocument();
    // the demo time is filled into the sentence, never shown as a raw {when}
    expect(screen.queryByText(/\{when\}/)).not.toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /Applicants দেখুন|Details দেখুন/ });
    links.forEach((link) => expect(link).toHaveAttribute("href", "/requirements/r9/applicants"));
  });
});
