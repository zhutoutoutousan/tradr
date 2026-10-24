/** Hosts we may bounce to after login (relative paths always OK on current origin). */
function isAllowedReturnOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname;
    if (h === "localhost" || h === "127.0.0.1") return true;
    if (h === "www.tradr.it.com" || h === "tradr.it.com") return true;
    // Vercel previews for this project
    if (h.endsWith(".vercel.app") && h.includes("tradr")) return true;
    return false;
  } catch {
    return false;
  }
}

/** Relative path or absolute URL on an allowed Tradr host. */
export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  const t = raw.trim();
  if (!t) return fallback;

  if (t.startsWith("/") && !t.startsWith("//") && !t.includes("://")) {
    return t;
  }

  try {
    const u = new URL(t);
    if (!isAllowedReturnOrigin(u.origin)) return fallback;
    return `${u.origin}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }
}

const OAUTH_NEXT_KEY = "tradr.auth.next";

export function stashAuthNext(pathOrUrl: string): void {
  const v = safeNextPath(pathOrUrl, "");
  if (!v) return;
  try {
    sessionStorage.setItem(OAUTH_NEXT_KEY, v);
  } catch {
    /* private mode */
  }
  try {
    localStorage.setItem(OAUTH_NEXT_KEY, v);
  } catch {
    /* private mode */
  }
}

export function peekAuthNext(): string | null {
  try {
    return sessionStorage.getItem(OAUTH_NEXT_KEY) ?? localStorage.getItem(OAUTH_NEXT_KEY);
  } catch {
    return null;
  }
}

/** Prefer explicit param (survives OAuth cross-origin), then storage. */
export function resolveAuthNext(explicit: string | null | undefined, fallback = "/play"): string {
  const fromParam = explicit ? safeNextPath(explicit, "") : "";
  if (fromParam) {
    clearAuthNext();
    return fromParam;
  }
  return takeAuthNext(fallback);
}

export function takeAuthNext(fallback = "/play"): string {
  let v: string | null = null;
  try {
    v = sessionStorage.getItem(OAUTH_NEXT_KEY);
    sessionStorage.removeItem(OAUTH_NEXT_KEY);
  } catch {
    /* ignore */
  }
  if (!v) {
    try {
      v = localStorage.getItem(OAUTH_NEXT_KEY);
      localStorage.removeItem(OAUTH_NEXT_KEY);
    } catch {
      /* ignore */
    }
  }
  return safeNextPath(v, fallback);
}

function clearAuthNext(): void {
  try {
    sessionStorage.removeItem(OAUTH_NEXT_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(OAUTH_NEXT_KEY);
  } catch {
    /* ignore */
  }
}

/** Full return URL for OAuth ?next= (survives landing on a different allowed host). */
export function authReturnUrl(path: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  const p = safeNextPath(path, "/");
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${origin}${p}`;
}
