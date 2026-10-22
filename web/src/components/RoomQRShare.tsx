"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface RoomQRShareProps {
  room: string;
  baseUrl?: string;
}

export default function RoomQRShare({ room, baseUrl }: RoomQRShareProps) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build the shareable URL
  const siteUrl = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const roomUrl = `${siteUrl}/multiplayer?room=${room}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareVia = async (method: "native" | "whatsapp" | "telegram") => {
    const text = `Join my Tradr multiplayer room: ${room}`;

    if (method === "native" && navigator.share) {
      try {
        await navigator.share({
          title: "Tradr Multiplayer Room",
          text,
          url: roomUrl,
        });
      } catch (err) {
        console.log("Share cancelled or failed:", err);
      }
    } else if (method === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${text}\n${roomUrl}`)}`,
        "_blank"
      );
    } else if (method === "telegram") {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(roomUrl)}&text=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById("room-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx!.fillStyle = "#fff";
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tradr-room-${room}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="relative">
      {/* Share Button */}
      <button
        onClick={() => setShowQR(!showQR)}
        className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-400 transition-all hover:border-emerald-500/50 hover:bg-emerald-950/50"
        title="Share Room"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share Room
      </button>

      {/* QR Modal */}
      {showQR && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            style={{ transform: 'translateY(50%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowQR(false)}
              className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-slate-200"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Share Room</h2>
              <p className="mt-1 text-sm text-slate-400">
                Invite others to join room <span className="font-mono text-emerald-400">{room}</span>
              </p>
            </div>

            {/* QR Code */}
            <div className="mb-6 flex justify-center rounded-lg bg-white p-6">
              <QRCodeSVG
                id="room-qr-code"
                value={roomUrl}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            {/* Room URL */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-slate-400">
                Room URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomUrl}
                  readOnly
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                />
                <button
                  onClick={copyToClipboard}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-400 transition-all hover:border-emerald-500/50 hover:bg-emerald-950/50"
                >
                  {copied ? "✓" : "Copy"}
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              {/* Native Share (Mobile) */}
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  onClick={() => shareVia("native")}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-750"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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

              {/* WhatsApp */}
              <button
                onClick={() => shareVia("whatsapp")}
                className="flex items-center justify-center gap-2 rounded-lg border border-green-700 bg-green-950/50 px-4 py-3 text-sm font-medium text-green-400 transition-all hover:border-green-600 hover:bg-green-950"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </button>

              {/* Telegram */}
              <button
                onClick={() => shareVia("telegram")}
                className="flex items-center justify-center gap-2 rounded-lg border border-blue-700 bg-blue-950/50 px-4 py-3 text-sm font-medium text-blue-400 transition-all hover:border-blue-600 hover:bg-blue-950"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Telegram
              </button>

              {/* Download QR */}
              <button
                onClick={downloadQR}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-750"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download QR
              </button>
            </div>

            {/* Instructions */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-xs text-slate-400">
              <p className="font-medium text-slate-300">📱 How to use:</p>
              <ul className="mt-2 space-y-1">
                <li>• Scan QR code with camera app</li>
                <li>• Copy & share the URL</li>
                <li>• Use share buttons for instant messaging</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
