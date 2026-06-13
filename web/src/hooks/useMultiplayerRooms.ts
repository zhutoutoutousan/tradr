"use client";

import { useEffect, useState } from "react";
import { aggregateLobbyRooms, MP_LOBBY_CHANNEL, type MpRoomListing } from "@/lib/multiplayer/lobby";
import { supabase, supabaseEnabled } from "@/lib/supabase";

function browsePresenceKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `browse-${crypto.randomUUID()}`;
  return `browse-${Math.random().toString(36).slice(2)}`;
}

export function useMultiplayerRooms() {
  const [rooms, setRooms] = useState<MpRoomListing[]>([]);
  const [loading, setLoading] = useState(supabaseEnabled);

  useEffect(() => {
    if (!supabaseEnabled || !supabase) {
      setLoading(false);
      return;
    }

    const sb = supabase;
    const ch = sb.channel(MP_LOBBY_CHANNEL, {
      config: { presence: { key: browsePresenceKey() } },
    });

    ch.on("presence", { event: "sync" }, () => {
      setRooms(aggregateLobbyRooms(ch.presenceState()));
      setLoading(false);
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setLoading(false);
      }
    });

    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  return { rooms, loading, enabled: supabaseEnabled };
}