"use client";

import { useState } from "react";
import MultiplayerGame from "@/components/MultiplayerGame";
import type { MpRole } from "@/hooks/useMultiplayer";

function randomRoom() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function MultiplayerJoin({
  initialRoom = "",
  initialSpectate = false,
  onBack,
}: {
  initialRoom?: string;
  initialSpectate?: boolean;
  onBack?: () => void;
}) {
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [room, setRoom] = useState(initialRoom.toUpperCase());
  const [role, setRole] = useState<MpRole>(initialSpectate ? "spectator" : "player");

  function join(e?: React.FormEvent) {
    e?.preventDefault();
    const n = name.trim() || (role === "spectator" ? "Observer" : "Trader");
    const r = (room.trim() || randomRoom()).toUpperCase();
    setName(n);
    setRoom(r);
    setJoined(true);
  }

  if (joined) {
    return (
      <MultiplayerGame
        key={`${room}:${name}:${role}`}
        room={room}
        name={name}
        role={role}
        onLeave={() => (onBack ? onBack() : setJoined(false))}
      />
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        {onBack && (
          <button type="button" onClick={onBack} className="mb-4 text-sm text-slate-400 hover:text-white">
            ← Back
          </button>
        )}
        <h1 className="text-2xl font-bold">Multiplayer</h1>
        <p className="mt-1 text-sm text-slate-400">3-minute race on the same live market. Play or watch as observer.</p>

        <form onSubmit={join} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === "spectator" ? "Observer" : "Trader"}
              maxLength={20}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-base outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Join as</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("player")}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                  role === "player"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 text-slate-400 hover:bg-slate-800"
                }`}
              >
                Trader
              </button>
              <button
                type="button"
                onClick={() => setRole("spectator")}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                  role === "spectator"
                    ? "border-violet-500 bg-violet-500/10 text-violet-300"
                    : "border-slate-700 text-slate-400 hover:bg-slate-800"
                }`}
              >
                Observer
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Room code (optional)</label>
            <div className="flex gap-2">
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value.toUpperCase())}
                placeholder="Auto-create"
                maxLength={8}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 font-mono text-base uppercase outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setRoom(randomRoom())}
                className="shrink-0 rounded-lg border border-slate-700 px-3 text-sm hover:bg-slate-800"
              >
                Random
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-500 py-3.5 text-base font-bold text-slate-950 hover:bg-sky-400"
          >
            {role === "spectator" ? "Watch room" : room.trim() ? "Join room" : "Create & play"}
          </button>
        </form>
      </div>
    </div>
  );
}
