/**
 * "+880 1712-345678", "01712345678", "1712345678" → "01712345678".
 * Returns "" when it isn't a Bangladeshi mobile number (backend rule: 01[3-9]XXXXXXXX).
 */
export function toLocalBdPhone(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(3);
  if (digits && !digits.startsWith("0")) digits = `0${digits}`;
  return /^01[3-9]\d{8}$/.test(digits) ? digits : "";
}
