// Turns API errors (config/exceptions.py format) into messages in the current language.
// { detail, code, fields: { phone: [{ code, message }] }, retry_after }

/** Message for the whole form: network, throttling, wrong credentials, or generic. */
export function getFormError(err, { t }) {
  const response = err?.response;
  if (!response) return t("error.network");

  const data = response.data || {};
  if (response.status === 429 || data.code === "throttled") {
    return data.retry_after
      ? t("error.throttledWait", { seconds: data.retry_after })
      : t("error.throttled");
  }
  if (data.code === "invalid_credentials") return t("error.invalid_credentials");
  if (data.fields) return null; // shown next to each field instead
  return t("error.generic");
}

// Server codes that share a message with one we already translate
const CODE_ALIASES = {
  "phone.invalid_phone": "phone.invalid",
  "fullName.min_length": "fullName.short",
  "fullName.blank": "fullName.short",
  "email.blank": "email.invalid",
  "password.blank": "password.required",
};

/**
 * Per-field messages: error.<field>.<code> when we have a translation,
 * otherwise the server's English message (better than a raw key).
 */
export function getFieldErrors(err, { t, has }, fieldNames = {}) {
  const fields = err?.response?.data?.fields;
  if (!fields) return {};

  const result = {};
  for (const [field, errors] of Object.entries(fields)) {
    const first = Array.isArray(errors) ? errors[0] : errors;
    const code = typeof first === "object" ? first.code : String(first);
    const message = typeof first === "object" ? first.message : String(first);
    const name = fieldNames[field] || field;
    const key = `error.${CODE_ALIASES[`${name}.${code}`] || `${name}.${code}`}`;
    result[name] = has(key) ? t(key) : message || t("error.generic");
  }
  return result;
}
