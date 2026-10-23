"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CandleChart from "@/components/CandleChart";
import { defaultSpeed, playbackAt, tickRange } from "@/lib/replay/playback";
import { fetchReplay, fetchReplayComments, postReplayComment, type StoredReplay } from "@/lib/replay/storage";
import type { ReplayComment } from "@/lib/replay/types";

const SPEEDS = [1, 2, 5, 10, 20, 50] as const;
const DANMAKU_MS = 9000;
const VIEWER_NAME_KEY = "tradr.viewer.name";
const VIEWER_COLOR = "#f0abfc";
const POLL_MS = 5000;

interface TimelineMsg {
  key: string;
  t: number;
  name: string;
  text: string;
  color: string;
  viewer: boolean;
}

interface Bullet {
  id: string;
  text: string;
  color: string;
  top: number;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function ReplayPlayer({ id }: { id: string }) {
  const [replay, setReplay] = useState<StoredReplay | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [comments, setComments] = useState<ReplayComment[]>([]);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [viewerName, setViewerName] = useState(() =>
    typeof window === "undefined" ? "" : (localStorage.getItem(VIEWER_NAME_KEY) ?? ""),
  );
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const tickRef = useRef(0);
  const prevTickRef = useRef(0);
  const playingRef = useRef(true);
  const speedRef = useRef(1);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const rec = replay?.recording ?? null;

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    let alive = true;
    fetchReplay(id)
      .then((r) => {
        if (!alive) return;
        if (!r) {
          setStatus("missing");
          return;
        }
        const [t0] = tickRange(r.recording);
        tickRef.current = t0;
        prevTickRef.current = t0;
        setTick(t0);
        setSpeed(defaultSpeed(r.recording, SPEEDS));
        setReplay(r);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [id]);

  // Viewer danmaku: initial load, then poll for comments from other viewers.
  useEffect(() => {
    if (status !== "ready") return;
    let alive = true;
    let since: string | undefined;
    const load = () =>
      fetchReplayComments(id, since)
        .then((rows) => {
          if (!alive || rows.length === 0) return;
          since = rows[rows.length - 1].created_at;
          setComments((prev) => {
            const seen = new Set(prev.map((c) => c.id));
            return [...prev, ...rows.filter((c) => !seen.has(c.id))];
          });
        })
        .catch(() => {});
    void load();
    const iv = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [id, status]);

  const nameOf = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>();
    for (const p of rec?.participants ?? []) m.set(p.id, { name: p.name, color: p.color });
    return m;
  }, [rec]);

  const timeline = useMemo<TimelineMsg[]>(() => {
    if (!rec) return [];
    const msgs: TimelineMsg[] = [];
    rec.events.forEach((ev, i) => {
      if (ev.k !== "chat") return;
      msgs.push({
        key: `ev-${i}`,
        t: ev.t,
        name: ev.name,
        text: ev.text,
        color: nameOf.get(ev.id)?.color ?? "#cbd5e1",
        viewer: false,
      });
    });
    for (const c of comments) {
      msgs.push({ key: c.id, t: c.tick, name: c.name, text: c.text, color: c.color ?? VIEWER_COLOR, viewer: true });
    }
    return msgs.sort((a, b) => a.t - b.t);
  }, [rec, comments, nameOf]);

  const fire = useCallback((msgs: { key: string; name: string; text: string; color: string }[]) => {
    if (msgs.length === 0) return;
    const fresh: Bullet[] = msgs.slice(-8).map((m) => ({
      id: `${m.key}-${Date.now()}`,
      text: `${m.name}: ${m.text}`,
      color: m.color,
      top: 6 + Math.random() * 70,
    }));
    setBullets((b) => [...b.slice(-20), ...fresh]);
    const ids = new Set(fresh.map((f) => f.id));
    window.setTimeout(() => setBullets((b) => b.filter((x) => !ids.has(x.id))), DANMAKU_MS);
  }, []);

  const timelineRef = useRef<TimelineMsg[]>([]);
  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  useEffect(() => {
    if (!rec) return;
    const [, t1] = tickRange(rec);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(250, now - last);
      last = now;
      if (playingRef.current) {
        const next = Math.min(t1, tickRef.current + (dt / rec.msPerTick) * speedRef.current);
        const prev = tickRef.current;
        tickRef.current = next;
        const crossed = timelineRef.current.filter((m) => m.t > prev && m.t <= next);
        fire(crossed);
        prevTickRef.current = next;
        setTick(next);
        if (next >= t1) setPlaying(false);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rec, fire]);

  const seek = (t: number) => {
    tickRef.current = t;
    prevTickRef.current = t;
    setTick(t);
    setBullets([]);
  };

  const state = useMemo(() => (rec ? playbackAt(rec, tick) : null), [rec, tick]);

  const visibleChat = useMemo(() => timeline.filter((m) => m.t <= tick).slice(-60), [timeline, tick]);
  const visibleChatLen = visibleChat.length;
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [visibleChatLen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || posting) return;
    const name = viewerName.trim() || "Viewer";
    localStorage.setItem(VIEWER_NAME_KEY, name);
    setPosting(true);
    setPostError(null);
    try {
      const c = await postReplayComment(id, tickRef.current, name, text, VIEWER_COLOR);
      setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
      fire([{ key: c.id, name: c.name, text: c.text, color: VIEWER_COLOR }]);
      setDraft("");
    } catch {
      setPostError("Could not send — try again.");
    } finally {
      setPosting(false);
    }
  };

  if (status !== "ready" || !rec || !state) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-300">
        <p data-testid="replay-status">
          {status === "loading" && "Loading replay…"}
          {status === "missing" && "Replay not found."}
          {status === "error" && "Could not load replay."}
        </p>
        <Link href="/" className="text-emerald-400 hover:text-emerald-300">
          ← Back to Tradr
        </Link>
      </div>
    );
  }

  const [t0, t1] = tickRange(rec);
  const me = state.rows.find((r) => r.kind === "me");
  const others = state.rows
    .filter((r) => r.kind !== "me" && r.position)
    .map((r) => ({ label: r.name.split(" ")[0], color: r.color, side: r.position!.side, entry: r.position!.entry }));
  const ended = tick >= t1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" data-testid="replay-player">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="font-bold text-emerald-400">
              ◆ Tradr
            </Link>
            <span className="rounded bg-fuchsia-500/15 px-2 py-0.5 text-xs font-semibold uppercase text-fuchsia-300">
              Replay · {rec.mode === "multiplayer" ? "Multiplayer" : "Solo"}
            </span>
            <span className="truncate text-sm text-slate-400" data-testid="replay-title">
              {rec.marketLabel}
              {rec.room ? ` · room ${rec.room}` : ""}
            </span>
          </div>
          <span className="text-xs text-slate-500">{new Date(replay!.created_at).toLocaleString()}</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_300px]">
        <section className="min-w-0">
          <div className="relative">
            <CandleChart
              candles={state.candles}
              position={me?.position ? { ...me.position, size: 0, openBar: 0 } : null}
              botPositions={others}
              height={380}
            />
            <div className="danmaku-track pointer-events-none absolute inset-0 overflow-hidden rounded-lg" data-testid="replay-danmaku">
              {bullets.map((d) => (
                <div
                  key={d.id}
                  className="danmaku-bullet absolute whitespace-nowrap rounded-full bg-slate-950/75 px-3 py-1 text-xs font-medium shadow-lg"
                  style={{ top: `${d.top}%`, color: d.color }}
                >
                  {d.text}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <button
              data-testid="replay-toggle"
              onClick={() => {
                if (ended) seek(t0);
                setPlaying((p) => (ended ? true : !p));
              }}
              className="w-20 rounded-lg bg-emerald-500 py-1.5 font-bold text-slate-950 hover:bg-emerald-400"
            >
              {ended ? "↺ Replay" : playing ? "❚❚ Pause" : "▶ Play"}
            </button>
            <input
              type="range"
              min={t0}
              max={t1}
              step={1}
              value={Math.floor(tick)}
              onChange={(e) => seek(Number(e.target.value))}
              className="min-w-[160px] flex-1 accent-emerald-400"
              aria-label="Replay position"
              data-testid="replay-scrubber"
            />
            <span className="font-mono text-xs tabular-nums text-slate-400" data-testid="replay-clock">
              {clock((tick - t0) * rec.msPerTick)} / {clock((t1 - t0) * rec.msPerTick)}
            </span>
            <div className="flex gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`rounded px-2 py-1 font-mono text-xs ${
                    s === speed ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3" data-testid="replay-leaderboard">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Leaderboard</p>
            <div className="space-y-1">
              {state.rows.map((r, i) => (
                <div key={r.id} className={`flex items-center justify-between rounded px-2 py-1 text-sm ${r.kind === "me" ? "bg-emerald-500/10" : ""}`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-4 font-mono text-xs text-slate-500">{i + 1}</span>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                    <span className="truncate text-slate-200">{r.name}</span>
                    {r.kind === "bot" && <span className="text-[10px] uppercase text-slate-600">bot</span>}
                    {r.position && (
                      <span className={`text-[10px] font-bold uppercase ${r.position.side === "long" ? "text-emerald-400" : "text-rose-400"}`}>
                        {r.position.side}
                      </span>
                    )}
                  </div>
                  <span className={`font-mono text-xs tabular-nums ${r.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {r.returnPct >= 0 ? "+" : ""}
                    {r.returnPct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-[260px] flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chat & danmaku</p>
            <div className="max-h-64 flex-1 space-y-1 overflow-y-auto text-sm" data-testid="replay-chat">
              {visibleChat.length === 0 && <p className="text-xs text-slate-600">No messages yet at this point.</p>}
              {visibleChat.map((m) => (
                <p key={m.key} className="break-words">
                  <span className="font-semibold" style={{ color: m.color }}>
                    {m.name}
                    {m.viewer ? " 👁" : ""}:
                  </span>{" "}
                  <span className="text-slate-300">{m.text}</span>
                </p>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={submit} className="mt-2 space-y-2">
              <input
                value={viewerName}
                onChange={(e) => setViewerName(e.target.value.slice(0, 24))}
                placeholder="Your name"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                data-testid="replay-viewer-name"
              />
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 120))}
                  placeholder="Send danmaku at this moment…"
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                  data-testid="replay-danmaku-input"
                />
                <button
                  type="submit"
                  disabled={posting || !draft.trim()}
                  className="rounded-lg bg-fuchsia-500 px-3 py-1.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
                  data-testid="replay-danmaku-send"
                >
                  Send
                </button>
              </div>
              {postError && <p className="text-xs text-rose-400">{postError}</p>}
            </form>
          </div>
        </aside>
      </main>
    </div>
  );
}
