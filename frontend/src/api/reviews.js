import { api } from "./client";

/**
 * Public list of reviews for a tutor.
 */
export async function getTutorReviews(slug, params = {}) {
  const response = await api.get(`/tutors/${encodeURIComponent(slug)}/reviews/`, { params });
  return response.data;
}

/**
 * Submit review for a tutor (guardian with confirmed match).
 */
export async function createTutorReview(slug, { rating, comment }) {
  const response = await api.post(`/tutors/${encodeURIComponent(slug)}/reviews/create/`, {
    rating,
    comment,
  });
  return response.data;
}

/**
 * Check if the signed in guardian can review this tutor and get their existing review.
 */
export async function getGuardianReviewStatus(slug) {
  const response = await api.get(`/guardians/me/reviews/${encodeURIComponent(slug)}/`);
  return response.data;
}
