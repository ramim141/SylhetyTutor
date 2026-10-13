import { api } from "./client";

/**
 * My notifications, newest first.
 * @returns {Promise<{ count: number, unread_count: number, next: string|null, results: Object[] }>}
 */
export async function getNotifications(params = {}, config = {}) {
  const response = await api.get("/notifications/", { ...config, params });
  return response.data;
}

/** Just the number for the bell. */
export async function getUnreadCount(config = {}) {
  const response = await api.get("/notifications/unread-count/", config);
  return response.data.unread_count;
}

export async function markRead(id) {
  const response = await api.post(`/notifications/${id}/read/`);
  return response.data;
}

export async function markAllRead() {
  const response = await api.post("/notifications/read-all/");
  return response.data;
}
