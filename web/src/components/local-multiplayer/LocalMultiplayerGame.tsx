"use client";

import { MultiplayerGameView } from "@/components/MultiplayerGame";
import { useLocalMultiplayer } from "@/hooks/useLocalMultiplayer";

export function LocalMultiplayerGame({
  username,
  isHost,
  remoteUsername,
  onLeave,
}: {
  username: string;
  isHost: boolean;
  remoteUsername: string;
  onLeave: () => void;
}) {
  const session = useLocalMultiplayer(username, isHost, remoteUsername);
  return <MultiplayerGameView room="LOCAL" onLeave={onLeave} session={session} local />;
}
