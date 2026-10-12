import api from "./client";
import { tokens } from "./tokens";

export const authApi = {
  /**
   * Register a new guardian or tutor user.
   * @param {Object} payload - { full_name, phone, email, password, role, preferred_language }
   * @returns {Promise<{ user: Object, access: string, refresh: string }>}
   */
  async register(payload) {
    const { data } = await api.post("/auth/register/", payload);
    return data;
  },

  /**
   * Authenticate user with phone/email and password.
   * @param {Object} credentials - { identifier, password }
   * @returns {Promise<{ user: Object, access: string, refresh: string }>}
   */
  async login({ identifier, password }) {
    const { data } = await api.post("/auth/login/", { identifier, password });
    return data;
  },

  /**
   * Terminate user session and blacklist refresh token on server.
   */
  async logout() {
    const refresh = tokens.getRefresh();
    try {
      if (refresh) {
        await api.post("/auth/logout/", { refresh });
      }
    } catch {
      // Ignore network / blacklist errors on logout
    }
  },

  /**
   * Change password. The server signs out every other device and returns a fresh
   * token pair for this one, which replaces the stored tokens.
   * @param {{ old_password: string, new_password: string }} payload
   */
  async changePassword(payload) {
    const { data } = await api.post("/auth/password/change/", payload);
    tokens.set(data);
    return data;
  },

  /**
   * Fetch currently authenticated user profile.
   * @returns {Promise<Object>}
   */
  async getMe() {
    const { data } = await api.get("/auth/me/");
    return data;
  },

  /**
   * Update authenticated user profile (name, email, preferred_language).
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async updateMe(payload) {
    const { data } = await api.patch("/auth/me/", payload);
    return data;
  },
};

export default authApi;
