import axios from "axios";
import { tokens } from "./tokens";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
export const REFRESH_PATH = "/auth/token/refresh/";
// Fired when the session can't be renewed; the auth store (Sprint 1) listens and logs out
export const SESSION_EXPIRED_EVENT = "sylhetytutor:session-expired";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const access = tokens.getAccess();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

// One refresh at a time: parallel 401s wait for the same request
let refreshPromise = null;

function refreshAccessToken() {
  const refresh = tokens.getRefresh();
  if (!refresh) return Promise.reject(new Error("No refresh token"));
  refreshPromise ??= axios
    .post(`${API_URL}${REFRESH_PATH}`, { refresh }, { adapter: api.defaults.adapter })
    .then(({ data }) => {
      // ROTATE_REFRESH_TOKENS is on, so the response carries a new refresh token too
      tokens.set(data);
      return data.access;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isRefreshCall = original?.url?.includes(REFRESH_PATH);

    if (error.response?.status !== 401 || !original || original._retried || isRefreshCall) {
      throw error;
    }

    original._retried = true;
    try {
      const access = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch {
      tokens.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      throw error;
    }
  }
);

export default api;
