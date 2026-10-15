/** "17 Oct 2026, 5:00 pm" in the reader's language (Mixed reads like Bangla dates). */
export function formatDateTime(value, lang) {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
