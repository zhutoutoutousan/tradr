"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PLANET_BOOKS,
  PLANET_DRILLS,
  PLANET_EDGES,
  PLANET_NODES,
  getPlanetBook,
  getPlanetDrill,
  getPlanetNode,
  neighborsOf,
  type PlanetNode,
} from "@/lib/academy/planet";
import {
  lexiconByTopic,
  lexiconForLesson,
  loadLangSettings,
  saveLangSettings,
  type AcademyLangSettings,
} from "@/lib/academy/polyglot";
import BilingualPanel from "./BilingualPanel";
import LangPairSettings from "./LangPairSettings";

const SIZE = 640;
const CX = SIZE / 2;
const CY = SIZE / 2;
const ORBIT_R = [0, 118, 190, 262];

function polar(orbit: number, angleDeg: number) {
  const r = ORBIT_R[Math.min(orbit, ORBIT_R.length - 1)] ?? 0;
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

export default function LearningPlanet() {
  const [selectedId, setSelectedId] = useState("tradr-planet");
  const [drillPick, setDrillPick] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lang, setLang] = useState<AcademyLangSettings | null>(null);

  useEffect(() => {
    setLang(loadLangSettings());
  }, []);

  const selected = getPlanetNode(selectedId) ?? PLANET_NODES[0];
  const nbrs = useMemo(() => neighborsOf(selected.id), [selected.id]);
  const drill = selected.drillId ? getPlanetDrill(selected.drillId) : null;
  const book = selected.bookId ? getPlanetBook(selected.bookId) : null;

  const activeDrill = drillPick ? getPlanetDrill(drillPick) : drill;

  const bilingualUnits = useMemo(() => {
    if (selected.id === "domain-polyglot" || selected.id === "c-dual-subtitle") {
      return lexiconForLesson({
        polyglotIds: ["dual-subtitle", "bid-ask", "sharpe", "nash-mm"],
        polyglotTopics: ["meta"],
      });
    }
    if (selected.id === "domain-meta" || selected.id === "c-paper-muscle" || selected.id === "drill-meta-probe") {
      return lexiconByTopic("meta");
    }
    if (
      selected.id === "domain-quant26" ||
      selected.id === "bridge-quant26" ||
      selected.id === "paper-tradefm" ||
      selected.id === "paper-agentic-survey"
    ) {
      return lexiconForLesson({
        polyglotIds: ["risk-neutral", "lob-foundation", "agentic-quant", "nash-mm", "paper-muscle"],
        polyglotTopics: ["pricing", "microstructure"],
      });
    }
    if (selected.id === "paper-mm-eq" || selected.id === "c-nash" || selected.id === "c-spread") {
      return lexiconForLesson({
        polyglotIds: ["nash-mm", "bid-ask", "paper-muscle"],
        polyglotTopics: ["market-making", "microstructure"],
      });
    }
    return lexiconByTopic("meta").slice(0, 2);
  }, [selected.id]);

  const updateLang = (next: AcademyLangSettings) => {
    saveLangSettings(next);
    setLang(next);
  };

  const positions = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of PLANET_NODES) m.set(n.id, polar(n.orbit, n.angle));
    return m;
  }, []);

  return (
    <div className="min-w-0" data-testid="learning-planet">
      <div className="mb-6 max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-400">Learning Planet</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Quant <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 bg-clip-text text-transparent">学习星球</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          mindcraft-style knowledge graph — market making, meta-learning / polyglot dual study, interview probes, desk
          library. Cold PROBE first; every star carries a SOURCE.
        </p>
      </div>

      {lang ? (
        <div className="mb-6">
          <LangPairSettings value={lang} onChange={updateLang} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#050814]">
          <Starfield />
          <div className="relative mx-auto aspect-square w-full max-w-[640px]">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="Quant learning planet graph">
              {[1, 2, 3].map((o) => (
                <circle
                  key={o}
                  cx={CX}
                  cy={CY}
                  r={ORBIT_R[o]}
                  fill="none"
                  stroke="rgba(244,63,94,0.12)"
                  strokeWidth={1}
                  strokeDasharray="4 10"
                />
              ))}
              {PLANET_EDGES.map((e, i) => {
                const a = positions.get(e.from);
                const b = positions.get(e.to);
                if (!a || !b) return null;
                const hot = e.from === selected.id || e.to === selected.id;
                return (
                  <line
                    key={`${e.from}-${e.to}-${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={hot ? "rgba(251,113,133,0.55)" : "rgba(148,163,184,0.12)"}
                    strokeWidth={hot ? 1.6 : 1}
                  />
                );
              })}
              {PLANET_NODES.map((n) => {
                const p = positions.get(n.id)!;
                const active = n.id === selected.id;
                const r = n.kind === "star" ? 22 : n.kind === "domain" ? 14 : 10;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x},${p.y})`}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedId(n.id);
                      setDrillPick(n.drillId ?? null);
                      setRevealed(false);
                    }}
                    data-testid={`planet-node-${n.id}`}
                  >
                    {active ? (
                      <circle
                        r={r + 10}
                        fill="none"
                        stroke={n.accent}
                        strokeOpacity={0.45}
                        className="animate-pulse"
                      />
                    ) : null}
                    <circle
                      r={r}
                      fill={n.accent}
                      fillOpacity={active ? 1 : 0.85}
                      stroke="rgba(15,23,42,0.9)"
                      strokeWidth={2}
                    />
                    {n.kind === "star" ? (
                      <text textAnchor="middle" dy="0.35em" fontSize="14" fill="#0f172a">
                        ◆
                      </text>
                    ) : null}
                    <text
                      y={r + 14}
                      textAnchor="middle"
                      fontSize="10"
                      fill={active ? "#fff" : "#94a3b8"}
                      className="select-none"
                    >
                      {n.label.length > 18 ? `${n.label.slice(0, 16)}…` : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="px-4 pb-3 text-center text-[11px] text-slate-600">
            Click a star · orbits = domain → concept → paper/drill/book
          </p>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Inspector node={selected} nbrs={nbrs} onJump={setSelectedId} />

          {lang && bilingualUnits.length ? (
            <BilingualPanel units={bilingualUnits} settings={lang} title="Orbit dual · 轨道双语" />
          ) : null}

          {activeDrill ? (
            <DrillCard
              key={activeDrill.id}
              drill={activeDrill}
              revealed={revealed}
              onReveal={() => setRevealed(true)}
              onReset={() => setRevealed(false)}
            />
          ) : null}

          {book ? <BookCard bookId={book.id} /> : null}
        </aside>
      </div>

      <section className="mt-10" data-testid="planet-interview-rail">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-300">Interview arena</h2>
            <p className="text-xs text-slate-500">Original probes · retrieval first · no pasted answer banks</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PLANET_DRILLS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDrillPick(d.id);
                setRevealed(false);
                const node = PLANET_NODES.find((n) => n.drillId === d.id);
                if (node) setSelectedId(node.id);
                else setSelectedId("domain-interview");
              }}
              className={`min-w-[200px] shrink-0 rounded-xl border px-3 py-3 text-left transition ${
                drillPick === d.id || selected.drillId === d.id
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-600"
              }`}
              data-testid={`planet-drill-${d.id}`}
            >
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{d.firmFlavor}</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{d.topic}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{d.prompt}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10" data-testid="planet-library">
        <div className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-300">Desk library</h2>
          <p className="text-xs text-slate-500">Foundational titles — WorldCat / publisher search only</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLANET_BOOKS.map((b) => (
            <a
              key={b.id}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-violet-950/20 p-4 transition hover:border-violet-500/40"
              data-testid={`planet-book-${b.id}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/80">{b.level}</p>
              <h3 className="mt-1 text-sm font-bold text-white group-hover:text-violet-100">{b.title}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{b.author}</p>
              <p className="mt-2 text-xs text-slate-400">{b.why}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {b.topics.map((t) => (
                  <span key={t} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {t}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-slate-900/40 to-sky-950/30 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300">Featured research</p>
        <h2 className="mt-1 text-lg font-bold text-white">Equilibria and Learning in Competitive Market Making</h2>
        <p className="mt-1 text-sm text-slate-400">
          Onger &amp; Foscari · arXiv:2610.30891 — PSNE for strategic makers, volatility-scaled spreads, no-regret learning to
          the Nash envelope.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="https://arxiv.org/abs/2610.30891"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-rose-400"
          >
            Open abstract
          </a>
          <a
            href="https://arxiv.org/pdf/2610.30891"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/10"
          >
            PDF
          </a>
          <button
            type="button"
            onClick={() => {
              setSelectedId("paper-mm-eq");
              setDrillPick("drill-spread-vol");
              setRevealed(false);
            }}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Focus on planet
          </button>
        </div>
      </section>
    </div>
  );
}

function Starfield() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 opacity-70 animate-[planetDrift_48s_linear_infinite]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.55), transparent), radial-gradient(1px 1px at 80% 30%, rgba(255,255,255,0.4), transparent), radial-gradient(1.5px 1.5px at 40% 70%, rgba(255,255,255,0.45), transparent), radial-gradient(1px 1px at 65% 55%, rgba(255,255,255,0.35), transparent), radial-gradient(1px 1px at 25% 85%, rgba(255,255,255,0.4), transparent), radial-gradient(1.5px 1.5px at 90% 75%, rgba(255,255,255,0.3), transparent)",
        }}
      />
      <div className="absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="absolute left-[30%] top-[40%] h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
    </div>
  );
}

function Inspector({
  node,
  nbrs,
  onJump,
}: {
  node: PlanetNode;
  nbrs: ReturnType<typeof neighborsOf>;
  onJump: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4" data-testid="planet-inspector">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{node.kind}</p>
      <h2 className="mt-1 text-lg font-bold" style={{ color: node.accent }}>
        {node.label}
      </h2>
      <p className="mt-1 text-sm text-slate-400">{node.gloss}</p>
      {node.claim ? (
        <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
          <span className="font-semibold text-rose-300">CLAIM · </span>
          {node.claim}
        </p>
      ) : null}
      {node.source ? (
        <a
          href={node.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-xs font-medium text-sky-300 hover:text-sky-200"
        >
          SOURCE · {node.source.title} ↗
        </a>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {node.href ? (
          <Link href={node.href} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950">
            Open in Academy
          </Link>
        ) : null}
        {node.externalUrl ? (
          <a
            href={node.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            External ↗
          </a>
        ) : null}
      </div>
      {nbrs.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-600">Neighbors</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {nbrs.map(({ edge, node: n }) => (
              <button
                key={`${edge.from}-${edge.to}-${n.id}`}
                type="button"
                onClick={() => onJump(n.id)}
                className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-rose-500/40"
              >
                <span className="text-slate-600">{edge.label}</span> {n.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DrillCard({
  drill,
  revealed,
  onReveal,
  onReset,
}: {
  drill: NonNullable<ReturnType<typeof getPlanetDrill>>;
  revealed: boolean;
  onReveal: () => void;
  onReset: () => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4" data-testid="planet-drill-panel">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">{drill.firmFlavor}</p>
      <h3 className="mt-1 font-bold text-white">{drill.topic}</h3>
      <p className="mt-2 text-sm text-slate-300">{drill.prompt}</p>
      <div className="mt-3 space-y-2">
        {drill.choices.map((c) => {
          const show = revealed && choice;
          const ok = c.correct;
          const picked = choice === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={revealed}
              onClick={() => setChoice(c.id)}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                picked ? "border-amber-400 bg-amber-500/15" : "border-slate-700 bg-slate-950/40 hover:border-slate-500"
              } ${show && ok ? "border-emerald-500/60" : ""} ${show && picked && !ok ? "border-rose-500/60" : ""}`}
            >
              {c.text}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!choice || revealed}
          onClick={onReveal}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 disabled:opacity-40"
        >
          Check
        </button>
        <button
          type="button"
          onClick={() => {
            setChoice(null);
            onReset();
          }}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
        >
          Reset
        </button>
      </div>
      {revealed ? (
        <p className="mt-3 text-xs text-slate-400">
          <span className="font-semibold text-emerald-300">ASSESS · </span>
          {drill.explain}
          <span className="mt-1 block text-slate-600">{drill.sourceNote}</span>
        </p>
      ) : null}
    </div>
  );
}

function BookCard({ bookId }: { bookId: string }) {
  const b = getPlanetBook(bookId);
  if (!b) return null;
  return (
    <a
      href={b.url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 transition hover:border-violet-400/50"
    >
      <p className="text-[10px] uppercase tracking-wide text-violet-300">Library</p>
      <p className="mt-1 font-bold text-white">{b.title}</p>
      <p className="text-xs text-slate-500">{b.author}</p>
      <p className="mt-2 text-xs text-slate-400">{b.why}</p>
    </a>
  );
}
