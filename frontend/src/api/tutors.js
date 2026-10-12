import { api } from "./client";

/**
 * Search verified tutors. `params` use the same names as the page URL
 * (q, area, subject, class_level, university, gender, fee_min, fee_max, sort, page).
 * @returns {Promise<{ count: number, next: string|null, previous: string|null, results: Object[] }>}
 */
export async function getTutors(params = {}, config = {}) {
  const response = await api.get("/tutors/", { ...config, params });
  return response.data;
}

/**
 * One tutor's public profile (no phone, email or documents).
 * Rejects with a 404 response when the address is unknown or the tutor is not listed.
 */
export async function getTutor(slug, config = {}) {
  const response = await api.get(`/tutors/${encodeURIComponent(slug)}/`, config);
  return response.data;
}
