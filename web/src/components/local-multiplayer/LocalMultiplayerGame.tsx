"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { MultiplayerGameView } from "@/components/MultiplayerGame";
import { useLocalMultiplayer } from "@/hooks/useLocalMultiplayer";
import { LocalMultiplayerHost } from "./LocalMultiplayerHost";

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
  const [adding, setAdding] = useState(false);
  const close = useCallback(() => setAdding(false), []);

  const addButton =
    isHost && session.phase === "lobby" ? (
      <button
        type="button"
        onClick={() => setAdding(true)}
        data-testid="local-mp-add-player"
        className="rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/20"
      >
        ➕ Weiteren Spieler hinzufügen
      </button>
    ) : undefined;

  return (
    <>
      <MultiplayerGameView room="LOCAL" onLeave={onLeave} session={session} local lobbyExtra={addButton} />
      {adding &&
        createPortal(
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/95 backdrop-blur" data-testid="local-mp-add-modal">
            <LocalMultiplayerHost username={username} onConnected={close} onCancel={close} addingPlayer />
          </div>,
          document.body,
        )}
    </>
  );
}
