const UTM_KEY = "sylhetytutor_utm";

/**
 * Capture UTM query parameters from the current URL and store them in sessionStorage.
 */
export function captureUTM() {
  if (typeof window === "undefined" || !window.location) return;
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source");
    const medium = params.get("utm_medium");
    const campaign = params.get("utm_campaign");

    if (source || medium || campaign) {
      const data = {
        acquisition_source: source || "",
        acquisition_medium: medium || "",
        acquisition_campaign: campaign || "",
      };
      window.sessionStorage.setItem(UTM_KEY, JSON.stringify(data));
    }
  } catch (err) {
    // SessionStorage may be disabled in private mode
    console.warn("Could not capture UTM parameters:", err);
  }
}

/**
 * Retrieve any captured UTM parameters for registration payload.
 */
export function getStoredUTM() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(UTM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
