const UNITS = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "2 days ago" in the reader's language; a bare date is not enough to see who waited longest. */
export function timeAgo(iso, lang, now = Date.now()) {
  if (!iso) return "";
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(lang === "bn" ? "bn-BD" : "en", {
    numeric: "auto",
  });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.trunc(seconds / size), unit);
  }
  return formatter.format(0, "minute");
}
