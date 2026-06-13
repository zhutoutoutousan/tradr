"use client";

import { useEffect, useRef, useState } from "react";
import {
  aggregateLobbyRooms,
  listingFromBroadcast,
  LOBBY_LISTING_EVENT,
  lobbyChannelConfig,
  mergeRoomListings,
  MP_LOBBY_CHANNEL,
  type MpRoomListing,
} from "@/lib/multiplayer/lobby";
import { supabase, supabaseEnabled } from "@/lib/supabase";

function browsePresenceKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `browse-${crypto.randomUUID()}`;
  return `browse-${Math.random().toString(36).slice(2)}`;
}

export function useMultiplayerRooms() {
  const [rooms, setRooms] = useState<MpRoomListing[]>([]);
  const [loading, setLoading] = useState(supabaseEnabled);
  const listingsRef = useRef(new Map<string, MpRoomListing>());

  useEffect(() => {
    if (!supabaseEnabled || !supabase) {
      setLoading(false);
      return;
    }

    const sb = supabase;
    const ch = sb.channel(MP_LOBBY_CHANNEL, lobbyChannelConfig(browsePresenceKey()));

    const refreshFromPresence = () => {
      setRooms(mergeRoomListings(listingsRef.current, aggregateLobbyRooms(ch.presenceState())));
    };

    ch.on("broadcast", { event: LOBBY_LISTING_EVENT }, ({ payload }) => {
      const listing = listingFromBroadcast(payload);
      if (!listing) return;
      listingsRef.current.set(listing.code, listing);
      setRooms(mergeRoomListings(listingsRef.current, []));
    });

    ch.on("presence", { event: "sync" }, refreshFromPresence);
    ch.on("presence", { event: "join" }, refreshFromPresence);
    ch.on("presence", { event: "leave" }, refreshFromPresence);

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ browsing: true });
        refreshFromPresence();
        setLoading(false);
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setLoading(false);
      }
    });

    const prune = setInterval(() => {
      setRooms(mergeRoomListings(listingsRef.current, []));
    }, 2000);

    return () => {
      clearInterval(prune);
      sb.removeChannel(ch);
    };
  }, []);

  return { rooms, loading, enabled: supabaseEnabled };
}