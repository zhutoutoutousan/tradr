"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MultiplayerGame from "@/components/MultiplayerGame";

function randomRoom() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function JoinForm() {
  const params = useSearchParams();
  const initialRoom = (params.get("room") ?? "").toUpperCase();

  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [room, setRoom] = useState(initialRoom);

  function join(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim() || "Trader";
    const r = (room.trim() || randomRoom()).toUpperCase();
    setName(n);
    setRoom(r);
    setJoined(true);
  }

  if (joined) {
    return <MultiplayerGame key={`${room}:${name}`} room={room} name={name} onLeave={() => setJoined(false)} />;
  }

  const invited = initialRoom.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <Link href="/" className="text-sm font-bold text-emerald-400">
          ◆ Tradr
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Multiplayer arena</h1>
        <p className="mt-1 text-sm text-slate-400">
          {invited ? (
            <>
              You&apos;ve been invited to room <span className="font-mono text-emerald-300">{initialRoom}</span>. Pick a
              name and jump in.
            </>
          ) : (
            <>Race friends and the bots on the exact same live market. Create a room or join one with a code.</>
          )}
        </p>

        <form onSubmit={join} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Trader McTradeface"
              maxLength={20}
              autoFocus
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Room code</label>
            <div className="flex gap-2">
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value.toUpperCase())}
                placeholder="Leave blank to create"
                maxLength={8}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-emerald-500"
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
            className="w-full rounded-lg bg-emerald-500 py-3 font-bold text-slate-950 hover:bg-emerald-400"
          >
            {room.trim() ? "Join room" : "Create room"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Prefer solo?{" "}
          <Link href="/play" className="text-emerald-400 hover:underline">
            Play vs bots
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function MultiplayerPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading…</div>}>
      <JoinForm />
    </Suspense>
  );
}
