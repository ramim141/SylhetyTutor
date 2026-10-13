import { create } from "zustand";
import { authApi } from "../api/auth";
import { tokens } from "../api/tokens";
import { SESSION_EXPIRED_EVENT } from "../api/client";
import { useLanguageStore } from "./languageStore";

export const useAuthStore = create((set) => ({
  user: null,
  status: "idle", // 'idle' | 'loading' | 'authenticated' | 'guest' | 'error' (server unreachable)
  error: null,

  /**
   * Initialize auth on app load: verifies stored tokens by calling getMe().
   */
  loadUser: async () => {
    const access = tokens.getAccess();
    const refresh = tokens.getRefresh();

    if (!access && !refresh) {
      set({ user: null, status: "guest" });
      return;
    }

    set({ status: "loading" });
    try {
      const user = await authApi.getMe();
      if (user?.preferred_language) {
        useLanguageStore.getState().setLang(user.preferred_language);
      }
      set({ user, status: "authenticated", error: null });
    } catch (err) {
      if (err.response?.status === 401) {
        // Server says the session is over (refresh already failed in the client)
        tokens.clear();
        set({ user: null, status: "guest" });
      } else {
        // Flaky mobile network or server down: keep the tokens so a retry can restore
        // the session instead of signing the user out
        set({ user: null, status: "error" });
      }
    }
  },

  /**
   * Login user with phone/email and password.
   */
  login: async ({ identifier, password }) => {
    set({ status: "loading", error: null });
    try {
      const { user, access, refresh } = await authApi.login({ identifier, password });
      tokens.set({ access, refresh });

      if (user?.preferred_language) {
        useLanguageStore.getState().setLang(user.preferred_language);
      }

      set({ user, status: "authenticated", error: null });
      return user;
    } catch (err) {
      set({ status: "guest", error: err.response?.data?.code || "invalid_credentials" });
      throw err;
    }
  },

  /**
   * Register a new user (guardian or tutor).
   */
  register: async (payload) => {
    set({ status: "loading", error: null });
    try {
      const { user, access, refresh } = await authApi.register(payload);
      tokens.set({ access, refresh });

      if (user?.preferred_language) {
        useLanguageStore.getState().setLang(user.preferred_language);
      }

      set({ user, status: "authenticated", error: null });
      return user;
    } catch (err) {
      set({ status: "guest", error: err.response?.data?.code || "invalid" });
      throw err;
    }
  },

  /**
   * Logout user, clear tokens, and reset status.
   */
  logout: async () => {
    await authApi.logout();
    tokens.clear();
    set({ user: null, status: "guest", error: null });
  },
}));

// Automatically respond to session expiration events from api client interceptor
if (typeof window !== "undefined") {
  window.addEventListener(SESSION_EXPIRED_EVENT, () => {
    tokens.clear();
    useAuthStore.setState({ user: null, status: "guest", error: null });
  });
}

export default useAuthStore;
