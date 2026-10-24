/** Only allow same-origin relative paths (block open redirects). */
export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return fallback;
  return t;
}

const OAUTH_NEXT_KEY = "tradr.auth.next";

export function stashAuthNext(path: string): void {
  try {
    sessionStorage.setItem(OAUTH_NEXT_KEY, safeNextPath(path));
  } catch {
    // private mode
  }
}

export function takeAuthNext(fallback = "/play"): string {
  try {
    const v = sessionStorage.getItem(OAUTH_NEXT_KEY);
    sessionStorage.removeItem(OAUTH_NEXT_KEY);
    return safeNextPath(v, fallback);
  } catch {
    return fallback;
  }
}
