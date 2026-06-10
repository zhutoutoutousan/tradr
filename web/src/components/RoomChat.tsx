"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/hooks/useMultiplayer";

export default function RoomChat({
  messages,
  onSend,
  disabled,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 px-3 py-2 text-sm font-semibold text-slate-300">Room chat</div>
      <div className="max-h-48 min-h-[120px] flex-1 overflow-y-auto px-3 py-2 text-sm">
        {messages.length === 0 ? (
          <p className="text-slate-500">Say hi — messages also fly as danmaku on the chart.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="mb-1.5">
              <span className="font-semibold text-sky-300">{m.name}</span>
              <span className="text-slate-500"> · </span>
              <span className="text-slate-200">{m.text}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-slate-800 p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
          maxLength={120}
          placeholder={disabled ? "Chat unavailable" : "Message or danmaku…"}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
