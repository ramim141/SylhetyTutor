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
 * Top & featured tutors for homepage preview (Architecture Doc §4.2).
 */
export async function getFeaturedTutors(config = {}) {
  const response = await api.get("/tutors/featured/", config);
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

// --- my own profile (signed-in tutor) ---------------------------------------

/** My profile with `status`, `missing` (what is still needed to submit), `documents`, `can_edit`. */
export async function getMyProfile(config = {}) {
  const response = await api.get("/tutors/me/", config);
  return response.data;
}

/** Save any part of the draft; send only the fields that changed. */
export async function saveMyProfile(patch) {
  const response = await api.patch("/tutors/me/", patch);
  return response.data;
}

/** Send the finished profile to an admin (400 lists every missing field). */
export async function submitMyProfile() {
  const response = await api.post("/tutors/me/submit/");
  return response.data;
}

// The shared client sends JSON by default, which would turn a FormData body into JSON,
// so uploads name their own content type and let the browser add the boundary.
const MULTIPART = { "Content-Type": "multipart/form-data" };

/** Upload the NID (`kind` = "nid") or student-ID ("student_id") photo. Resolves to my profile. */
export async function uploadDocument(kind, file, { onProgress, signal } = {}) {
  const body = new FormData();
  body.append("file", file);
  const response = await api.put(`/tutors/me/documents/${kind}/`, body, {
    headers: MULTIPART,
    signal,
    timeout: 60000, // a phone photo on a slow connection
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return response.data;
}

export async function deleteDocument(kind) {
  const response = await api.delete(`/tutors/me/documents/${kind}/`);
  return response.data;
}

/**
 * My own document as an image Blob. The file sits behind a login, so an <img src> cannot
 * load it; the page fetches it with the token and shows an object URL instead.
 */
export async function getDocumentBlob(profileId, kind, config = {}) {
  const response = await api.get(`/tutors/documents/${profileId}/${kind}/`, {
    ...config,
    responseType: "blob",
  });
  return response.data;
}
