"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  buildRaceShareText,
  copyText,
  nativeShare,
  openShareWhatsApp,
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
  const [showModal, setShowModal] = useState(false);
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

  async function onCopyLink() {
    const ok = await copyText(url);
    flash(ok ? "Link copied" : "Could not copy");
  }

  async function onNative() {
    const ok = await nativeShare(payload);
    if (!ok) await onCopyLink();
  }

  async function downloadQR() {
    const svg = document.getElementById("qr-code-svg") as SVGElement | null;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tradr-room-${room}.png`;
        a.click();
        URL.revokeObjectURL(url);
        flash("QR code downloaded");
      });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }

  const btn =
    "rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors";

  if (compact) {
    return (
      <>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="w-full rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-600/20 transition-colors"
          >
            📱 Share Room
          </button>
          {hint && <p className="text-xs text-center text-emerald-400">{hint}</p>}
        </div>

        {showModal && (
          <QRShareModal
            room={room}
            url={url}
            payload={payload}
            onClose={() => setShowModal(false)}
            onCopyLink={onCopyLink}
            onNative={onNative}
            downloadQR={downloadQR}
            flash={flash}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Share room</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold hover:bg-emerald-500 transition-colors"
        >
          📱 QR Code
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button type="button" className={btn} onClick={onNative}>
            🔗 Share…
          </button>
        )}
        <button type="button" className={btn} onClick={() => openShareWhatsApp(payload)}>
          💬 WhatsApp
        </button>
        <button type="button" className={btn} onClick={onCopyLink}>
          📋 Copy link
        </button>
      </div>
      {hint && <p className="text-xs text-emerald-400">{hint}</p>}

      {showModal && (
        <QRShareModal
          room={room}
          url={url}
          payload={payload}
          onClose={() => setShowModal(false)}
          onCopyLink={onCopyLink}
          onNative={onNative}
          downloadQR={downloadQR}
          flash={flash}
        />
      )}
    </div>
  );
}

function QRShareModal({
  room,
  url,
  payload,
  onClose,
  onCopyLink,
  onNative,
  downloadQR,
  flash,
}: {
  room: string;
  url: string;
  payload: SharePayload;
  onClose: () => void;
  onCopyLink: () => void;
  onNative: () => void;
  downloadQR: () => void;
  flash: (msg: string) => void;
}) {
  async function onWhatsApp() {
    openShareWhatsApp(payload);
    flash("Opening WhatsApp...");
  }

  async function onTelegram() {
    const text = encodeURIComponent(`${payload.text}\n${url}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, "_blank");
    flash("Opening Telegram...");
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div
          className="relative w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-100">Share Room</h2>
            <p className="mt-1 text-sm text-slate-400">Invite friends to join your race</p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-3">
            <div className="bg-white p-3 sm:p-4 rounded-xl inline-block">
              <QRCodeSVG 
                id="qr-code-svg" 
                value={url} 
                size={180}
                level="M" 
                className="w-full h-auto max-w-[180px]"
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              Scan with camera app to join instantly
            </p>
          </div>

          {/* Room URL */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
              Room URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={url}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono"
              />
              <button
                onClick={onCopyLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3">
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                onClick={onNative}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-semibold text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </button>
            )}
            <button
              onClick={onWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>
            <button
              onClick={onTelegram}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-semibold text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.155.232.171.326.016.093.036.305.02.469z" />
              </svg>
              Telegram
            </button>
            <button
              onClick={downloadQR}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-semibold text-slate-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">📱 How to use:</h3>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>• Scan QR code with camera app</li>
              <li>• Copy & share the URL</li>
              <li>• Use share buttons for instant messaging</li>
            </ul>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
