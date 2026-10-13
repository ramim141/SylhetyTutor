import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "./authStore";
import { authApi } from "../api/auth";
import { tokens } from "../api/tokens";
import { SESSION_EXPIRED_EVENT } from "../api/client";
import { useLanguageStore } from "./languageStore";

vi.mock("../api/auth", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    updateMe: vi.fn(),
  },
}));

describe("authStore", () => {
  beforeEach(() => {
    tokens.clear();
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, status: "idle", error: null });
  });

  it("initializes to guest if no tokens exist", async () => {
    await useAuthStore.getState().loadUser();

    expect(useAuthStore.getState().status).toBe("guest");
    expect(useAuthStore.getState().user).toBeNull();
    expect(authApi.getMe).not.toHaveBeenCalled();
  });

  it("keeps the session when the network fails while checking it", async () => {
    tokens.set({ access: "acc-123", refresh: "ref-123" });
    authApi.getMe.mockRejectedValueOnce(new Error("Network Error"));

    await useAuthStore.getState().loadUser();

    expect(useAuthStore.getState().status).toBe("error");
    expect(tokens.getRefresh()).toBe("ref-123");
  });

  it("clears the session when the server rejects it", async () => {
    tokens.set({ access: "acc-123", refresh: "ref-123" });
    authApi.getMe.mockRejectedValueOnce({ response: { status: 401 } });

    await useAuthStore.getState().loadUser();

    expect(useAuthStore.getState().status).toBe("guest");
    expect(tokens.getRefresh()).toBeNull();
  });

  it("loads user profile if tokens exist", async () => {
    tokens.set({ access: "acc-123", refresh: "ref-123" });
    const mockUser = { id: "1", full_name: "Farhan", role: "guardian", preferred_language: "bn" };
    authApi.getMe.mockResolvedValueOnce(mockUser);

    await useAuthStore.getState().loadUser();

    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useLanguageStore.getState().lang).toBe("bn");
  });

  it("logs in successfully and sets tokens and user", async () => {
    const mockUser = { id: "2", full_name: "Rahim", role: "tutor", preferred_language: "mixed" };
    authApi.login.mockResolvedValueOnce({
      user: mockUser,
      access: "access-token",
      refresh: "refresh-token",
    });

    const user = await useAuthStore
      .getState()
      .login({ identifier: "01712345678", password: "Password123!" });

    expect(user).toEqual(mockUser);
    expect(tokens.getAccess()).toBe("access-token");
    expect(tokens.getRefresh()).toBe("refresh-token");
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it("registers successfully and sets tokens and user", async () => {
    const mockUser = { id: "3", full_name: "Karim", role: "guardian", preferred_language: "en" };
    authApi.register.mockResolvedValueOnce({
      user: mockUser,
      access: "reg-access",
      refresh: "reg-refresh",
    });

    const user = await useAuthStore.getState().register({
      full_name: "Karim",
      phone: "01711223344",
      password: "Password123!",
      role: "guardian",
    });

    expect(user).toEqual(mockUser);
    expect(tokens.getAccess()).toBe("reg-access");
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("logs out and clears tokens and user state", async () => {
    tokens.set({ access: "acc", refresh: "ref" });
    useAuthStore.setState({ user: { id: "1" }, status: "authenticated" });

    await useAuthStore.getState().logout();

    expect(authApi.logout).toHaveBeenCalled();
    expect(tokens.getAccess()).toBeNull();
    expect(tokens.getRefresh()).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe("guest");
  });

  it("resets store on session expired event", () => {
    tokens.set({ access: "expired", refresh: "expired" });
    useAuthStore.setState({ user: { id: "1" }, status: "authenticated" });

    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));

    expect(tokens.getAccess()).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe("guest");
  });
});
