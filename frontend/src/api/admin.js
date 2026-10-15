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

// --- payments, commissions, call list ------------------------------------------

/** status: pending (default) | verified | rejected. { counts, results } */
export async function getAdminPayments(params = {}, config = {}) {
  const response = await api.get("/admin/payments/", { ...config, params });
  return response.data;
}

export async function verifyPayment(id) {
  const response = await api.post(`/admin/payments/${id}/verify/`);
  return response.data;
}

export async function rejectPayment(id, reason) {
  const response = await api.post(`/admin/payments/${id}/reject/`, { reason });
  return response.data;
}

/** status: pending (default) | paid | waived | disputed. { counts, results } */
export async function getAdminCommissions(params = {}, config = {}) {
  const response = await api.get("/admin/commissions/", { ...config, params });
  return response.data;
}

export async function markCommissionPaid(id) {
  const response = await api.post(`/admin/commissions/${id}/mark-paid/`);
  return response.data;
}

export async function waiveCommission(id, reason) {
  const response = await api.post(`/admin/commissions/${id}/waive/`, { reason });
  return response.data;
}

/** Guardians who did not answer the confirmation link. */
export async function getCallList(config = {}) {
  const response = await api.get("/admin/call-list/", config);
  return response.data;
}

/** answer: "yes" | "no"; channel: "call" | "whatsapp". */
export async function answerCall(id, answer, channel = "call") {
  const response = await api.post(`/admin/call-list/${id}/answer/`, { answer, channel });
  return response.data;
}
