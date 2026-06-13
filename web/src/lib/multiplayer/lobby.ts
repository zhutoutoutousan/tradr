export const MP_LOBBY_CHANNEL = "tradr-lobby";

export type MpRole = "player" | "spectator";

export interface LobbyPresenceMeta {
  room: string;
  role: MpRole;
}

export interface MpRoomListing {
  code: string;
  traders: number;
  spectators: number;
}

export function aggregateLobbyRooms(
  state: Record<string, LobbyPresenceMeta[]>,
): MpRoomListing[] {
  const byRoom = new Map<string, { traders: number; spectators: number }>();

  for (const entries of Object.values(state)) {
    for (const meta of entries) {
      if (!meta?.room) continue;
      const code = meta.room.toUpperCase();
      const counts = byRoom.get(code) ?? { traders: 0, spectators: 0 };
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