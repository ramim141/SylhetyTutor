// JWT storage. Sprint 8 moves the refresh token to an httpOnly cookie
// (Architecture Doc 12.5); only this file will need to change.
const ACCESS_KEY = "sylhetytutor_access";
const REFRESH_KEY = "sylhetytutor_refresh";

export const tokens = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
