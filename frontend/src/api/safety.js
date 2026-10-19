import { api } from "./client";

/**
 * Submit a report against a user/tutor.
 */
export async function createReport(data) {
  const response = await api.post("/reports/", data);
  return response.data;
}

/**
 * Request free tuition replacement for an unsatisfied match (11.5).
 */
export async function createReplacementRequest(matchId, { reason }) {
  const response = await api.post(`/matches/${encodeURIComponent(matchId)}/replace/`, { reason });
  return response.data;
}

/**
 * Admin list of reports.
 */
export async function getAdminReports(params = {}) {
  const response = await api.get("/admin/reports/", { params });
  return response.data;
}

/**
 * Admin resolve report.
 */
export async function resolveAdminReport(id, data) {
  const response = await api.post(`/admin/reports/${encodeURIComponent(id)}/resolve/`, data);
  return response.data;
}

/**
 * Admin one-click suspend tutor from report queue.
 */
export async function suspendTutorAdminReport(id, { reason }) {
  const response = await api.post(`/admin/reports/${encodeURIComponent(id)}/suspend-tutor/`, {
    reason,
  });
  return response.data;
}

/**
 * Admin list of replacement requests.
 */
export async function getAdminReplacements(params = {}) {
  const response = await api.get("/admin/replacements/", { params });
  return response.data;
}

/**
 * Admin resolve replacement request.
 */
export async function resolveAdminReplacement(id, data) {
  const response = await api.post(`/admin/replacements/${encodeURIComponent(id)}/resolve/`, data);
  return response.data;
}
