import { getFieldErrors, getFormError } from "./errors";
import { mixed } from "../i18n";

// Minimal stand-in for useTranslation() bound to the Mixed dictionary
const t = (key, params = {}) =>
  (mixed[key] ?? key).replace(/\{(\w+)\}/g, (m, name) => params[name] ?? m);
const has = (key) => key in mixed;
const i18n = { t, has };

const apiError = (status, data) => ({ response: { status, data } });

describe("getFormError", () => {
  it("reports a network problem when there is no response", () => {
    expect(getFormError(new Error("Network Error"), i18n)).toBe(mixed["error.network"]);
  });

  it("tells the user how long to wait when throttled", () => {
    const message = getFormError(apiError(429, { code: "throttled", retry_after: 42 }), i18n);

    expect(message).toContain("42");
  });

  it("maps invalid credentials", () => {
    expect(getFormError(apiError(401, { code: "invalid_credentials" }), i18n)).toBe(
      mixed["error.invalid_credentials"]
    );
  });

  it("leaves field errors to the fields", () => {
    expect(getFormError(apiError(400, { fields: { phone: [] } }), i18n)).toBeNull();
  });
});

describe("getFieldErrors", () => {
  it("translates known codes per field", () => {
    const errors = getFieldErrors(
      apiError(400, {
        fields: {
          phone: [{ code: "unique", message: "exists" }],
          password: [{ code: "password_too_common", message: "too common" }],
        },
      }),
      i18n
    );

    expect(errors.phone).toBe(mixed["error.phone.unique"]);
    expect(errors.password).toBe(mixed["error.password.password_too_common"]);
  });

  it("falls back to the server message, never a raw i18n key", () => {
    const errors = getFieldErrors(
      apiError(400, { fields: { phone: [{ code: "brand_new_code", message: "Server says no" }] } }),
      i18n
    );

    expect(errors.phone).toBe("Server says no");
  });

  it("renames API fields to form field names", () => {
    const errors = getFieldErrors(
      apiError(400, { fields: { full_name: [{ code: "min_length", message: "short" }] } }),
      i18n,
      { full_name: "fullName" }
    );

    expect(errors).toHaveProperty("fullName");
  });

  it("uses aliases for server codes that share a message", () => {
    const errors = getFieldErrors(
      apiError(400, { fields: { phone: [{ code: "invalid_phone", message: "bad" }] } }),
      i18n
    );

    expect(errors.phone).toBe(mixed["error.phone.invalid"]);
  });
});
