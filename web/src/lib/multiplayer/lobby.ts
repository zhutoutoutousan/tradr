export const MP_LOBBY_CHANNEL = "tradr-lobby";
export const LOBBY_LISTING_EVENT = "room-listing";
export const LOBBY_LISTING_TTL_MS = 12_000;

export type MpRole = "player" | "spectator";

export interface LobbyPresenceMeta {
  room?: string;
  role?: MpRole;
  browsing?: boolean;
  traders?: number;
  spectators?: number;
}

export interface RoomListingBroadcast {
  room: string;
  traders: number;
  spectators: number;
  at: number;
}

export interface MpRoomListing {
  code: string;
  traders: number;
  spectators: number;
  at: number;
}

export function lobbyChannelConfig(presenceKey: string) {
  return {
    config: {
      broadcast: { self: false },
      presence: { key: presenceKey },
    },
  } as const;
}

export function aggregateLobbyRooms(
  state: Record<string, LobbyPresenceMeta[]>,
): MpRoomListing[] {
  const byRoom = new Map<string, { traders: number; spectators: number; at: number }>();

  for (const entries of Object.values(state)) {
    for (const meta of entries) {
      if (meta?.browsing || !meta?.room) continue;
      const code = meta.room.toUpperCase();
      const counts = byRoom.get(code) ?? { traders: 0, spectators: 0, at: Date.now() };
      if (meta.role === "spectator") counts.spectators += 1;
      else counts.traders += 1;
      byRoom.set(code, counts);
    }
  }

  return [...byRoom.entries()]
    .filter(([, counts]) => counts.traders >= 1)
    .map(([code, counts]) => ({ code, ...counts }))
    .sort((a, b) => b.traders - a.traders || a.code.localeCompare(b.code));
}

export function mergeRoomListings(
  current: Map<string, MpRoomListing>,
  incoming: MpRoomListing[],
  now = Date.now(),
): MpRoomListing[] {
  for (const row of incoming) {
    if (row.traders < 1) continue;
    current.set(row.code, { ...row, at: row.at || now });
  }
  for (const [code, row] of current) {
    if (now - row.at > LOBBY_LISTING_TTL_MS) current.delete(code);
  }
  return [...current.values()]
    .filter((row) => row.traders >= 1)
    .sort((a, b) => b.traders - a.traders || a.code.localeCompare(b.code));
}

export function listingFromBroadcast(payload: unknown, now = Date.now()): MpRoomListing | null {
  const p = payload as RoomListingBroadcast;
  if (!p?.room || typeof p.traders !== "number" || p.traders < 1) return null;
  return {
    code: p.room.toUpperCase(),
    traders: p.traders,
    spectators: Math.max(0, p.spectators ?? 0),
    at: p.at || now,
  };
}