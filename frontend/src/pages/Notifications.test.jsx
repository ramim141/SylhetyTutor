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
});
