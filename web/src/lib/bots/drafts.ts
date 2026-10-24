import type { StrategyDef } from "@/lib/strategy";

export const PRIVATE_BOT_LIMIT = 3;

export interface BotDraft {
  id: string;
  strategy: StrategyDef;
  /** Always private for local drafts; cloud public comes later. */
  visibility: "private";
  updatedAt: string;
  createdAt: string;
}

const KEY = "tradr.bot.drafts.v1";

function readAll(): BotDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as BotDraft[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list: BotDraft[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listDrafts(): BotDraft[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDraft(id: string): BotDraft | null {
  return readAll().find((d) => d.id === id) ?? null;
}

export function saveDraft(strategy: StrategyDef, id?: string): { ok: true; draft: BotDraft } | { ok: false; error: string } {
  const now = new Date().toISOString();
  const all = readAll();
  if (id) {
    const i = all.findIndex((d) => d.id === id);
    if (i < 0) return { ok: false, error: "Draft not found" };
    const draft: BotDraft = { ...all[i], strategy: { ...strategy, v: 1 }, updatedAt: now };
    all[i] = draft;
    writeAll(all);
    return { ok: true, draft };
  }
  if (all.length >= PRIVATE_BOT_LIMIT) {
    return {
      ok: false,
      error: `Private bots are limited to ${PRIVATE_BOT_LIMIT}. Delete one or publish later (Pro / public).`,
    };
  }
  const draft: BotDraft = {
    id: crypto.randomUUID(),
    strategy: { ...strategy, v: 1 },
    visibility: "private",
    createdAt: now,
    updatedAt: now,
  };
  all.push(draft);
  writeAll(all);
  return { ok: true, draft };
}

export function deleteDraft(id: string): void {
  writeAll(readAll().filter((d) => d.id !== id));
}
