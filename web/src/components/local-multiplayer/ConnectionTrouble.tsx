"use client";

import * as Sentry from "@sentry/nextjs";
import {
  describeSummary,
  webrtcManager,
  type ConnectionDiagnostics,
  type PeerRole,
} from "@/lib/p2p/webrtc-manager";

export function reportConnectionTrouble(role: PeerRole, reason: string): ConnectionDiagnostics {
  const diag = webrtcManager.getDiagnostics();
  console.warn(`[LocalMP] ${role} connection trouble (${reason})`, diag);
  Sentry.captureMessage(`local-mp: ${reason}`, {
    level: "warning",
    tags: {
      local_mp_role: role,
      local_mp_reason: reason,
      local_mp_ice: diag.iceState,
      local_mp_local_mdns_only: String(diag.local.total > 0 && diag.local.mdns === diag.local.total),
      local_mp_remote_mdns_only: String(diag.remote.total > 0 && diag.remote.mdns === diag.remote.total),
    },
    extra: { ...diag },
  });
  return diag;
}

function hints(d: ConnectionDiagnostics): string[] {
  const out: string[] = [];
  if (d.local.total === 0 || d.remote.total === 0) {
    out.push(
      `${d.local.total === 0 ? "Dieses Gerät" : "Das andere Gerät"} hat keine Netzwerkverbindung gefunden. Beide Geräte müssen im selben WLAN sein oder eines öffnet einen Hotspot (WLAN muss an sein).`,
    );
  }
  const mdnsOnly = (s: ConnectionDiagnostics["local"]) => s.total > 0 && s.mdns === s.total;
  if (mdnsOnly(d.local) || mdnsOnly(d.remote)) {
    out.push(
      "Kamera-Zugriff auf beiden Geräten erlauben – ohne ihn verstecken Browser die WLAN-Adresse und die Geräte finden sich oft nicht.",
    );
  }
  out.push("Gäste-WLANs und öffentliche Netze blockieren oft Verbindungen zwischen Geräten – dann einen Handy-Hotspot nutzen.");
  out.push("Beim Neuversuch zeigt der Host einen neuen QR-Code; beide Codes müssen neu gescannt werden.");
  return out;
}

export function ConnectionTrouble({
  diagnostics,
  title = "Verbindung fehlgeschlagen",
  onRetry,
  onCancel,
}: {
  diagnostics: ConnectionDiagnostics;
  title?: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center p-6 text-center" data-testid="local-mp-trouble">
      <div className="mb-3 text-4xl">⚠️</div>
      <p className="mb-4 text-lg font-semibold text-white">{title}</p>
      <ul className="mb-4 space-y-2 text-left text-sm text-slate-300">
        {hints(diagnostics).map((h) => (
          <li key={h} className="flex gap-2">
            <span className="text-amber-400">•</span>
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <p className="mb-5 font-mono text-[11px] text-slate-500" data-testid="local-mp-diagnostics">
        Dieses Gerät: {describeSummary(diagnostics.local)} · Anderes Gerät: {describeSummary(diagnostics.remote)} · ICE:{" "}
        {diagnostics.iceState}
      </p>
      <div className="flex w-full gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-700 py-2.5 font-semibold text-slate-200 hover:bg-slate-800"
        >
          Zurück
        </button>
        <button
          onClick={onRetry}
          data-testid="local-mp-retry"
          className="flex-[2] rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500"
        >
          🔄 Neu versuchen
        </button>
      </div>
    </div>
  );
}
