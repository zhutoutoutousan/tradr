"use client";

import { useCallback, useEffect, useState } from "react";
import { authService } from "@/lib/auth/supabase-auth";
import { DEFAULT_KEY_SCOPES } from "@/lib/academy/connectors";

interface KeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const withToken = useCallback(async () => {
    const { session } = await authService.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Not signed in");
    return token;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const token = await withToken();
      const res = await fetch("/api/v1/academy/keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { keys?: KeyRow[]; error?: string; hint?: string };
      if (!res.ok) {
        setError([data.error, data.hint].filter(Boolean).join(" — "));
        return;
      }
      setError(null);
      setKeys(data.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load keys");
    }
  }, [withToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mint = async () => {
    setBusy(true);
    setPlaintext(null);
    try {
      const token = await withToken();
      const res = await fetch("/api/v1/academy/keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Cursor dogfood ${new Date().toISOString().slice(0, 10)}`,
          scopes: [...DEFAULT_KEY_SCOPES, "study:write"],
        }),
      });
      const data = (await res.json()) as { plaintext?: string; error?: string; hint?: string };
      if (!res.ok) {
        setError([data.error, data.hint].filter(Boolean).join(" — "));
        return;
      }
      setPlaintext(data.plaintext ?? null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mint failed");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      const token = await withToken();
      await fetch(`/api/v1/academy/keys/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      data-testid="academy-api-keys"
      className="rounded-2xl border border-teal-500/25 bg-slate-900/50 p-5"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-400">
        Developers · Tradr API
      </p>
      <h2 className="mt-1 text-lg font-extrabold text-white">API keys for Cursor / Claude Code</h2>
      <p className="mt-1 text-xs text-slate-400">
        Mint a <code className="text-teal-200">trad_…</code> key, set{" "}
        <code className="text-teal-200">TRADR_API_KEY</code> in Cursor Cloud Agent env, then call{" "}
        <code className="text-slate-300">/api/v1/academy/*</code> to study Quant 2026 + feeds.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="academy-mint-key"
          disabled={busy}
          onClick={() => void mint()}
          className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
        >
          Mint dogfood key
        </button>
        <a
          href="https://github.com/zhutoutoutousan/tradr/blob/main/web/docs/DOGFOOD-TRADR-API.md"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-teal-500/40"
        >
          Dogfood docs
        </a>
      </div>

      {plaintext ? (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-xs font-semibold text-amber-200">Copy now — shown once</p>
          <code
            data-testid="academy-key-plaintext"
            className="mt-2 block break-all font-mono text-sm text-amber-50"
          >
            {plaintext}
          </code>
          <p className="mt-2 text-[11px] text-amber-200/80">
            export TRADR_API_KEY=&apos;{plaintext.slice(0, 16)}…&apos;
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

      <ul className="mt-4 space-y-2">
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs"
          >
            <div>
              <p className="font-semibold text-slate-200">
                {k.name}{" "}
                <span className="font-mono text-slate-500">{k.key_prefix}…</span>
                {k.revoked_at ? (
                  <span className="ml-2 text-rose-400">revoked</span>
                ) : null}
              </p>
              <p className="text-slate-500">{(k.scopes || []).join(", ")}</p>
            </div>
            {!k.revoked_at ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void revoke(k.id)}
                className="rounded border border-slate-700 px-2 py-1 text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
              >
                Revoke
              </button>
            ) : null}
          </li>
        ))}
        {!keys.length && !error ? (
          <li className="text-xs text-slate-600">No keys yet — mint one for Cursor dogfooding.</li>
        ) : null}
      </ul>
    </section>
  );
}
