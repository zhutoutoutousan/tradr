"use client";

import { useState } from "react";
import {
  buildRaceShareText,
  copyText,
  copyWeChatMoments,
  nativeShare,
  openShareFacebook,
  openShareWhatsApp,
  openShareX,
  type SharePayload,
} from "@/lib/share";

export default function ShareButtons({
  room,
  rank,
  returnPct,
  spectateInvite,
  compact,
}: {
  room: string;
  rank?: number;
  returnPct?: number;
  spectateInvite?: boolean;
  compact?: boolean;
}) {
  const [hint, setHint] = useState<string | null>(null);
  const url =
    typeof window !== "undefined"
      ? (() => {
          const u = new URL("/multiplayer", window.location.origin);
          u.searchParams.set("room", room);
          if (spectateInvite) u.searchParams.set("spectate", "1");
          return u.toString();
        })()
      : "";

  const payload: SharePayload = {
    title: "Tradr multiplayer race",
    text: buildRaceShareText(room, rank, returnPct),
    url,
  };

  async function flash(msg: string) {
    setHint(msg);
    setTimeout(() => setHint(null), 2000);
  }

  async function onNative() {
    const ok = await nativeShare(payload);
    if (!ok) await onCopyLink();
  }

  async function onCopyLink() {
    const ok = await copyText(url);
    flash(ok ? "Link copied" : "Could not copy");
  }

  async function onWeChat() {
    const ok = await copyWeChatMoments(payload);
    flash(ok ? "Copied for WeChat / 朋友圈 paste" : "Could not copy");
  }

  const btn =
    "rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800 disabled:opacity-40";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Share room</p>}
      <div className="flex flex-wrap gap-2">
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button type="button" className={btn} onClick={onNative}>
            Share…
          </button>
        )}
        <button type="button" className={btn} onClick={() => openShareX(payload)}>
          X / Twitter
        </button>
        <button type="button" className={btn} onClick={onWeChat}>
          朋友圈
        </button>
        <button type="button" className={btn} onClick={() => openShareWhatsApp(payload)}>
          WhatsApp
        </button>
        <button type="button" className={btn} onClick={() => openShareFacebook(payload)}>
          Facebook
        </button>
        <button type="button" className={btn} onClick={onCopyLink}>
          Copy link
        </button>
      </div>
      {hint && <p className="text-xs text-emerald-400">{hint}</p>}
    </div>
  );
}
