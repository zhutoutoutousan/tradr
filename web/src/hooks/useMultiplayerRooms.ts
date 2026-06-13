"use client";

import { useEffect, useState } from "react";
import type { MpRoomListing } from "@/lib/multiplayer/lobby";
import { fetchActiveRooms, ROOM_POLL_MS } from "@/lib/multiplayer/roomDirectory";
import { supabaseEnabled } from "@/lib/supabase";

export function useMultiplayerRooms() {
  const [rooms, setRooms] = useState<MpRoomListing[]>([]);
  const [loading, setLoading] = useState(supabaseEnabled);

  useEffect(() => {
    if (!supabaseEnabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      const rows = await fetchActiveRooms();
      if (cancelled) return;
      setRooms(rows.map(({ code, traders, spectators }) => ({ code, traders, spectators, at: Date.now() })));
      setLoading(false);
    };

    void refresh();
    const poll = window.setInterval(() => {
      void refresh();
    }, ROOM_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, []);

  return { rooms, loading, enabled: supabaseEnabled };
}