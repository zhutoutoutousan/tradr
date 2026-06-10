export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

export function multiplayerShareUrl(room: string, spectate = false): string {
  if (typeof window === "undefined") return `/multiplayer?room=${encodeURIComponent(room)}`;
  const u = new URL("/multiplayer", window.location.origin);
  u.searchParams.set("room", room);
  if (spectate) u.searchParams.set("spectate", "1");
  return u.toString();
}

export function buildRaceShareText(room: string, rank?: number, returnPct?: number): string {
  const base = `Join my Tradr multiplayer race — room ${room}`;
  if (rank == null || returnPct == null) return base;
  const sign = returnPct >= 0 ? "+" : "";
  return `I finished #${rank} with ${sign}${returnPct.toFixed(1)}% in Tradr room ${room}! ${base}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function nativeShare(payload: SharePayload): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share(payload);
    return true;
  } catch {
    return false;
  }
}

export function openShareX(payload: SharePayload): void {
  const u = new URL("https://twitter.com/intent/tweet");
  u.searchParams.set("text", payload.text);
  u.searchParams.set("url", payload.url);
  window.open(u.toString(), "_blank", "noopener,noreferrer,width=600,height=520");
}

/** WeChat Moments has no web API — copy link + blurb for manual paste. */
export async function copyWeChatMoments(payload: SharePayload): Promise<boolean> {
  const blurb = `${payload.text}\n${payload.url}`;
  return copyText(blurb);
}

export function openShareFacebook(payload: SharePayload): void {
  const u = new URL("https://www.facebook.com/sharer/sharer.php");
  u.searchParams.set("u", payload.url);
  window.open(u.toString(), "_blank", "noopener,noreferrer,width=600,height=520");
}

export function openShareWhatsApp(payload: SharePayload): void {
  const u = new URL("https://wa.me/");
  u.searchParams.set("text", `${payload.text} ${payload.url}`);
  window.open(u.toString(), "_blank", "noopener,noreferrer");
}
