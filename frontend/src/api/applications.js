import { api } from "./client";

// --- tutor ---------------------------------------------------------------------

/** Apply to a matching requirement. 404 `requirement_not_found`, 409 `already_applied`. */
export async function applyToRequirement(requirementId, message = "") {
  const response = await api.post(`/tutors/me/apply/${requirementId}/`, { message });
  return response.data;
}

/** My applications, newest first; `contact` is filled once a demo is booked. */
export async function getMyApplications(config = {}) {
  const response = await api.get("/tutors/me/applications/", config);
  return response.data;
}

// --- guardian ------------------------------------------------------------------

/** Who applied to my requirement (opening this marks new ones as seen). */
export async function getApplicants(requirementId, config = {}) {
  const response = await api.get(`/requirements/${requirementId}/applications/`, config);
  return response.data;
}

export async function shortlistApplication(id) {
  const response = await api.post(`/applications/${id}/shortlist/`);
  return response.data;
}

export async function rejectApplication(id) {
  const response = await api.post(`/applications/${id}/reject/`);
  return response.data;
}

/** demoAt: ISO string. 400 `invalid_demo_time`, 409 `not_shortlisted`. */
export async function bookDemo(id, demoAt) {
  const response = await api.post(`/applications/${id}/book-demo/`, { demo_at: demoAt });
  return response.data;
}
