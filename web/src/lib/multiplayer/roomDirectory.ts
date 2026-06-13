import { supabase } from "@/lib/supabase";
import type { MpRoomListing } from "@/lib/multiplayer/lobby";

export const ROOM_HEARTBEAT_MS = 4000;
export const ROOM_POLL_MS = 3000;
export const ROOM_STALE_MS = 15_000;

export async function heartbeatActiveRoom(
  room: string,
  traders: number,
  spectators: number,
): Promise<void> {
  if (!supabase || traders < 1) return;
  const room_code = room.toUpperCase();
  await supabase.from("active_mp_rooms").upsert(
    {
      room_code,
      traders,
      spectators,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_code" },
  );
}

export async function clearActiveRoom(room: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("active_mp_rooms").delete().eq("room_code", room.toUpperCase());
}

export async function fetchActiveRooms(): Promise<MpRoomListing[]> {
  if (!supabase) return [];
  const cutoff = new Date(Date.now() - ROOM_STALE_MS).toISOString();
  const { data, error } = await supabase
    .from("active_mp_rooms")
    .select("room_code, traders, spectators, updated_at")
    .gte("updated_at", cutoff)
    .gte("traders", 1)
    .order("updated_at", { ascending: false });
  if (error) {
    console.warn("active_mp_rooms fetch", error.message);
    return [];
  }
  const now = Date.now();
  return (data ?? []).map((row) => ({
    code: row.room_code as string,
    traders: Number(row.traders),
    spectators: Number(row.spectators),
    at: new Date(row.updated_at as string).getTime() || now,
  }));
}