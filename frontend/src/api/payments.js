import { api } from "./client";

// --- tutor ---------------------------------------------------------------------

/** Where to send money and how much: { number, unlock_fee_enabled, unlock_fee, commission_amount, … }. */
export async function getPaymentInfo(config = {}) {
  const response = await api.get("/payments/info/", config);
  return response.data;
}

/** My payments (never anyone's sender number), oldest first as the API returns them. */
export async function getMyPayments(config = {}) {
  const response = await api.get("/tutors/me/payments/", config);
  return response.data;
}

/** { suspended: bool, results: [commission] }, newest first. */
export async function getMyCommissions(config = {}) {
  const response = await api.get("/tutors/me/commissions/", config);
  return response.data;
}

/** Pay the unlock fee of a booked demo: body { transaction_id, sender_number }. */
export async function payUnlock(applicationId, body) {
  const response = await api.post(`/tutors/me/applications/${applicationId}/pay-unlock/`, body);
  return response.data;
}

export async function payCommission(commissionId, body) {
  const response = await api.post(`/tutors/me/commissions/${commissionId}/pay/`, body);
  return response.data;
}

// --- guardian (no login: the signed link is the proof) ---------------------------

export async function getConfirmation(token) {
  const response = await api.get(`/confirmations/${token}/`);
  return response.data;
}

/** answer: "yes" | "no". 409 `already_answered`, 404 `invalid_link`. */
export async function answerConfirmation(token, answer) {
  const response = await api.post(`/confirmations/${token}/`, { answer });
  return response.data;
}
