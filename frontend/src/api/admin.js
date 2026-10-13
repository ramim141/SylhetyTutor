import { api } from "./client";

/**
 * The verification queue. `status` is pending (default) | approved | rejected.
 * @returns {Promise<{ count: number, counts: {pending:number, approved:number, rejected:number}, next: string|null, results: Object[] }>}
 */
export async function getApprovals(params = {}, config = {}) {
  const response = await api.get("/admin/approvals/", { ...config, params });
  return response.data;
}

/** Everything an admin needs to decide on one profile. */
export async function getApproval(id, config = {}) {
  const response = await api.get(`/admin/approvals/${id}/`, config);
  return response.data;
}

export async function approveProfile(id) {
  const response = await api.post(`/admin/approvals/${id}/approve/`);
  return response.data;
}

export async function rejectProfile(id, reason) {
  const response = await api.post(`/admin/approvals/${id}/reject/`, { reason });
  return response.data;
}

/**
 * One identity document as an image Blob. The file needs the login token, so it cannot be an
 * <img src>; `url` is the API path from the approval detail ("/api/v1/tutors/documents/…").
 */
export async function getDocumentBlob(url, config = {}) {
  const path = url.replace(/^\/api\/v1/, "");
  const response = await api.get(path, { ...config, responseType: "blob" });
  return response.data;
}
