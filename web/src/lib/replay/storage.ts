import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/game/session";
import type { ReplayComment, ReplayRecording } from "./types";

export interface StoredReplay {
  id: string;
  created_at: string;
  mode: "solo" | "multiplayer";
  room: string | null;
  round_number: number | null;
  market_id: string;
  market_label: string;
  duration_ticks: number;
  recording: ReplayRecording;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function replayUrl(id: string): string {
  return `/replay/${encodeURIComponent(id)}`;
}

/**
 * Store a recording. Multiplayer clients share one replay id per round, so the
 * first upload wins and later ones are ignored.
 */
export async function saveReplay(id: string, rec: ReplayRecording): Promise<void> {
  if (!supabase) throw new Error("supabase disabled");
  const { data } = await supabase.auth.getSession();
  const deviceId = getDeviceId();
  const { error } = await supabase.from("game_replays").upsert(
    {
      id,
      mode: rec.mode,
      room: rec.room ?? null,
      round_number: rec.roundNumber ?? null,
      market_id: rec.marketId,
      market_label: rec.marketLabel,
      duration_ticks: rec.durationTicks,
      recording: rec,
      device_id: isUuid(deviceId) ? deviceId : null,
      user_id: data.session?.user.id ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function fetchReplay(id: string): Promise<StoredReplay | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("game_replays").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as StoredReplay | null) ?? null;
}

export async function fetchReplayComments(id: string, since?: string): Promise<ReplayComment[]> {
  if (!supabase) return [];
  let q = supabase.from("replay_comments").select("*").eq("replay_id", id).order("created_at", { ascending: true }).limit(500);
  if (since) q = q.gt("created_at", since);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ReplayComment[]) ?? [];
}

export async function postReplayComment(
  replayId: string,
  tick: number,
  name: string,
  text: string,
  color: string,
): Promise<ReplayComment> {
  if (!supabase) throw new Error("supabase disabled");
  const { data, error } = await supabase
    .from("replay_comments")
    .insert({
      replay_id: replayId,
      tick: Math.max(0, Math.floor(tick)),
      name: name.trim().slice(0, 24) || "Viewer",
      text: text.trim().slice(0, 120),
      color,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ReplayComment;
}
