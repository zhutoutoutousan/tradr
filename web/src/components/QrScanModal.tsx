"use client";

import { useRef, useState } from "react";
import QrCameraView from "@/components/QrCameraView";

export function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access was blocked. Allow it in your browser settings, or type the room code instead.";
  }
  if (name === "NotFoundError") return "No camera found on this device.";
  if (name === "NotReadableError") return "The camera is in use by another app.";
  return "Could not start the camera. Type the room code instead.";
}

/**
 * Full-screen camera scanner. Calls onResult once per distinct code; return an
 * error string from onResult to keep scanning and show it.
 */
export default function QrScanModal({
  title,
  hint,
  onResult,
  onClose,
}: {
  title: string;
  hint?: string;
  onResult: (text: string) => string | void;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const handledRef = useRef(false);
  const lastRejectedRef = useRef("");

  const handleDecode = (text: string) => {
    if (handledRef.current || text === lastRejectedRef.current) return;
    const problem = onResult(text);
    if (problem) {
      lastRejectedRef.current = text;
      setError(problem);
      return;
    }
    handledRef.current = true;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 px-4 py-6"
      role="dialog"
      aria-modal="true"
      data-testid="qr-scan-modal"
    >
      <div className="w-full max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">
            Close
          </button>
        </div>
        <QrCameraView
          className="rounded-xl border border-slate-700"
          onDecode={handleDecode}
          onError={(err) => setError(cameraErrorMessage(err))}
        />
        {hint && !error && <p className="mt-3 text-center text-sm text-slate-400">{hint}</p>}
        {error && (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300" data-testid="qr-scan-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
