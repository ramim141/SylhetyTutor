// Where to send a visitor after login/register: the protected page that bounced them
// to /login (ProtectedRoute puts it in router state), with its query string and hash.
const DEFAULT_PATH = "/dashboard";
const AUTH_PATHS = ["/login", "/register"];

export function getReturnTo(location) {
  const from = location?.state?.from;
  const path = from?.pathname;
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_PATH;
  }
  if (AUTH_PATHS.includes(path)) return DEFAULT_PATH;
  return `${path}${from.search || ""}${from.hash || ""}`;
}

/** Router `state` that carries the destination across Login <-> Register links. */
export function keepReturnTo(location) {
  const from = location?.state?.from;
  return from ? { from } : undefined;
}
