import { api } from "./client";

// --- guardian: my requirements -----------------------------------------------

/** Counts and limits for the signed-in guardian: { open_count, draft_count, max_open, max_drafts }. */
export async function getGuardianMe(config = {}) {
  const response = await api.get("/guardians/me/", config);
  return response.data;
}

/** All my requirements (drafts, open, closed), newest first. */
export async function getMyRequirements(config = {}) {
  const response = await api.get("/requirements/", config);
  return response.data;
}

export async function getRequirement(id, config = {}) {
  const response = await api.get(`/requirements/${id}/`, config);
  return response.data;
}

/** Create a draft. Lookups are slugs: { class_level, area, subjects: [slug], budget_min, ... }. */
export async function createRequirement(body) {
  const response = await api.post("/requirements/", body);
  return response.data;
}

/** Change a draft; send only what changed. */
export async function updateRequirement(id, patch) {
  const response = await api.patch(`/requirements/${id}/`, patch);
  return response.data;
}

export async function deleteRequirement(id) {
  await api.delete(`/requirements/${id}/`);
}

/** Make it visible to matching tutors. 400 lists missing fields; 409 `too_many_open`. */
export async function publishRequirement(id) {
  const response = await api.post(`/requirements/${id}/publish/`);
  return response.data;
}

/** reason: found_tutor | no_longer_needed | other */
export async function closeRequirement(id, reason) {
  const response = await api.post(`/requirements/${id}/close/`, { reason });
  return response.data;
}

// --- tutor: requirements that match me ---------------------------------------

/** Open requirements for the approved tutor (403 until the profile is approved). */
export async function getMatchingRequirements(params = {}, config = {}) {
  const response = await api.get("/requirements/matching/", { ...config, params });
  return response.data;
}
