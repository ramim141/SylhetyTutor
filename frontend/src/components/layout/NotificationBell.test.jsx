import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { getUnreadCount } from "../../api/notifications";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";
import { useNotificationStore } from "../../store/notificationStore";

vi.mock("../../api/notifications", () => ({ getUnreadCount: vi.fn() }));

const renderBell = () =>
  render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "en" });
    useNotificationStore.setState({ unread: 0 });
  });

  it("is not shown to guests and asks the server nothing", () => {
    useAuthStore.setState({ user: null, status: "guest" });
    renderBell();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(getUnreadCount).not.toHaveBeenCalled();
  });

  it("shows the unread number and says it in the label", async () => {
    useAuthStore.setState({ user: { full_name: "N" }, status: "authenticated" });
    getUnreadCount.mockResolvedValue(3);
    renderBell();

    const link = await screen.findByRole("link", { name: "Notifications, 3 unread" });
    expect(link).toHaveAttribute("href", "/notifications");
    expect(link).toHaveTextContent("3");
  });

  it("shows no badge when everything is read, and survives a network error", async () => {
    useAuthStore.setState({ user: { full_name: "N" }, status: "authenticated" });
    getUnreadCount.mockRejectedValue(new Error("network"));
    renderBell();

    const link = await screen.findByRole("link", { name: "Notifications" });
    expect(link).not.toHaveTextContent(/\d/);
  });
});
