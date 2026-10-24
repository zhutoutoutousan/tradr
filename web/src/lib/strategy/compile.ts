import type { Candle, Side } from "@/lib/sim/types";
import type { BotDecision, OnBar } from "@/lib/sim/strategies";
import type { Expr, StrategyDef } from "./ast";
import { FormulaError, parseFormula, printFormula } from "./parse";
import { ALIASES, CROSS_SECTIONAL, FIELDS, OPS, type Field, type OpSpec } from "./ops";

const MAX_WINDOW = 1000;
const RULES = ["when", "long", "short", "exitLong", "exitShort"] as const;
type Rule = (typeof RULES)[number];

export class StrategyError extends Error {
  constructor(
    readonly field: string,
    message: string,
    readonly pos?: number,
  ) {
    super(`${field}: ${message}`);
    this.name = "StrategyError";
  }
}

type NodeSpec =
  | { kind: "field"; field: Field }
  | { kind: "const"; v: number }
  | { kind: "op"; op: OpSpec; kids: number[]; k: number[] };

/** A compiled, parameter-resolved strategy. Stateless; `instantiate()` makes an evaluator. */
export interface CompiledStrategy {
  def: StrategyDef;
  params: Record<string, number>;
  nodes: NodeSpec[];
  rules: Partial<Record<Rule, number>>;
  /** Node index of each `let` name, for charts and debugging. */
  named: Record<string, number>;
  slPct?: number;
  tpPct?: number;
  instantiate(): Evaluator;
}

const truthy = (v: number | undefined) => v !== undefined && v !== 0 && !Number.isNaN(v);

export function resolveParams(def: StrategyDef, overrides: Record<string, number> = {}): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, spec] of Object.entries(def.params ?? {})) {
    const v = overrides[name] ?? spec.default;
    out[name] = spec.int ? Math.round(v) : v;
  }
  return out;
}

export function compileStrategy(def: StrategyDef, overrides: Record<string, number> = {}): CompiledStrategy {
  const params = resolveParams(def, overrides);
  const nodes: NodeSpec[] = [];
  const cache = new Map<string, number>();
  const named: Record<string, number> = {};
  let field = "";

  const add = (key: string, spec: NodeSpec): number => {
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    nodes.push(spec);
    cache.set(key, nodes.length - 1);
    return nodes.length - 1;
  };
  const keyOf = (i: number) => `#${i}`;

  const fail = (msg: string): never => {
    throw new StrategyError(field, msg);
  };

  function staticValue(e: Expr): number {
    if (e.k === "num") return e.v;
    if (e.k === "id") {
      if (e.name in params) return params[e.name];
      return fail(`"${e.name}" must be a number or a parameter here`);
    }
    const a = e.args.map(staticValue);
    switch (e.fn) {
      case "add": return a[0] + a[1];
      case "sub": return a[0] - a[1];
      case "mul": return a[0] * a[1];
      case "div": return a[0] / a[1];
      case "neg": return -a[0];
      default: return fail(`"${printFormula(e)}" must be a number or a parameter here`);
    }
  }

  const isStatic = (e: Expr): boolean => {
    try {
      staticValue(e);
      return true;
    } catch {
      return false;
    }
  };

  function window(e: Expr, fn: string): number {
    const d = Math.floor(staticValue(e));
    if (!(d >= 1 && d <= MAX_WINDOW)) fail(`${fn}: window must be between 1 and ${MAX_WINDOW}, got ${d}`);
    return d;
  }

  function build(e: Expr): number {
    if (e.k === "num") return add(`c${e.v}`, { kind: "const", v: e.v });
    if (e.k === "id") {
      const name = e.name;
      if (name in named) return named[name];
      if (name in params) return add(`c${params[name]}`, { kind: "const", v: params[name] });
      const lower = name.toLowerCase();
      if ((FIELDS as readonly string[]).includes(lower)) return add(`f${lower}`, { kind: "field", field: lower as Field });
      const adv = /^adv(\d+)$/.exec(lower);
      if (adv) return build({ k: "call", fn: "sma", args: [{ k: "id", name: "volume" }, { k: "num", v: Number(adv[1]) }] });
      if (lower === "cap" || lower.startsWith("indclass")) return fail(`"${name}" needs company data that is not available yet`);
      return fail(`Unknown name "${name}"`);
    }
    let fn = ALIASES[e.fn] ?? e.fn;
    if ((fn === "min" || fn === "max") && e.args.length === 2) {
      // Alpha101: min(x, d) is ts_min when d is a number; otherwise the smaller of two series.
      fn = isStatic(e.args[1]) ? `ts_${fn}` : fn === "min" ? "least" : "greatest";
    }
    if (CROSS_SECTIONAL.has(fn)) return fail(`${fn}() compares several instruments and is not available for single-instrument bots yet`);
    const op = OPS[fn];
    if (!op) return fail(`Unknown function "${e.fn}"`);
    if (e.args.length !== op.args.length) return fail(`${e.fn}() takes ${op.args.length} arguments, got ${e.args.length}`);
    const kids: number[] = [];
    const k: number[] = [];
    op.args.forEach((kind, j) => {
      if (kind === "s") kids.push(build(e.args[j]));
      else k.push(window(e.args[j], e.fn));
    });
    return add(`${fn}(${kids.map(keyOf).join(",")};${k.join(",")})`, { kind: "op", op, kids, k });
  }

  function formula(name: string, src: string): number {
    field = name;
    let e: Expr;
    try {
      e = parseFormula(src);
    } catch (err) {
      if (err instanceof FormulaError) throw new StrategyError(name, err.message, err.pos);
      throw err;
    }
    return build(e);
  }

  for (const [name, src] of Object.entries(def.let ?? {})) {
    if (name in params || (FIELDS as readonly string[]).includes(name.toLowerCase())) {
      throw new StrategyError(`let.${name}`, `"${name}" is already a parameter or a built-in series`);
    }
    named[name] = formula(`let.${name}`, src);
  }
  const rules: Partial<Record<Rule, number>> = {};
  for (const r of RULES) {
    const src = def[r];
    if (src != null && src.trim() !== "") rules[r] = formula(r, src);
  }
  if (rules.long === undefined && rules.short === undefined) throw new StrategyError("long", "Add at least one entry rule (long or short)");

  const stop = (name: "slPct" | "tpPct"): number | undefined => {
    const v = def[name];
    if (v == null || v === "") return undefined;
    field = name;
    let n: number;
    try {
      n = typeof v === "number" ? v : staticValue(parseFormula(v));
    } catch (err) {
      if (err instanceof FormulaError) throw new StrategyError(name, err.message, err.pos);
      throw err;
    }
    if (!(n > 0 && n < 1)) fail("must be a fraction between 0 and 1 (0.02 = 2%)");
    return n;
  };
  const slPct = stop("slPct");
  const tpPct = stop("tpPct");

  const compiled: CompiledStrategy = {
    def,
    params,
    nodes,
    rules,
    named,
    slPct,
    tpPct,
    instantiate: () => new Evaluator(compiled),
  };
  return compiled;
}

/**
 * Incremental evaluator over a growing candle array. Each update recomputes
 * only the previous last bar (its `price` becomes the close) and the new bars;
 * a replaced or shifted window is recomputed from scratch.
 */
export class Evaluator {
  private out: number[][];
  private aux: number[][][];
  private src: Candle[] | null = null;
  private start = NaN;
  private len = 0;

  constructor(readonly c: CompiledStrategy) {
    this.out = c.nodes.map(() => []);
    this.aux = c.nodes.map((n) => (n.kind === "op" ? Array.from({ length: n.op.aux ?? 0 }, () => []) : []));
  }

  get length(): number {
    return this.len;
  }

  /** Evaluate every node over `candles[0..n)`; `price` is the live price on the last bar. */
  update(candles: Candle[], price: number, n = candles.length): void {
    let from = Math.max(0, this.len - 1);
    if (candles !== this.src || n < this.len || n === 0 || candles[0].time !== this.start) from = 0;
    this.src = candles;
    this.start = n ? candles[0].time : NaN;
    const { nodes } = this.c;
    for (let i = from; i < n; i++) {
      const bar = candles[i];
      for (let j = 0; j < nodes.length; j++) {
        const node = nodes[j];
        let v: number;
        if (node.kind === "const") v = node.v;
        else if (node.kind === "field") v = fieldValue(node.field, candles, i, n, price, bar);
        else v = node.op.fn(i, node.kids.map((kid) => this.out[kid]), node.k, this.out[j], this.aux[j]);
        this.out[j][i] = v;
      }
    }
    for (const o of this.out) o.length = n;
    this.len = n;
  }

  /** Latest value of a node. */
  value(node: number): number {
    return this.out[node][this.len - 1];
  }

  /** Full series of a node (shared array; do not mutate). */
  series(node: number): readonly number[] {
    return this.out[node];
  }

  /** Rule outcome for the latest bar given the side currently held. */
  decide(side: Side | null): BotDecision | null {
    const { rules, slPct, tpPct } = this.c;
    if (rules.when !== undefined && !truthy(this.value(rules.when))) return null;
    if (side === "long") return rules.exitLong !== undefined && truthy(this.value(rules.exitLong)) ? { close: true } : null;
    if (side === "short") return rules.exitShort !== undefined && truthy(this.value(rules.exitShort)) ? { close: true } : null;
    for (const s of ["long", "short"] as const) {
      const r = rules[s];
      if (r !== undefined && truthy(this.value(r))) return { open: { side: s, slPct, tpPct } };
    }
    return null;
  }
}

function fieldValue(f: Field, candles: Candle[], i: number, n: number, price: number, bar: Candle): number {
  switch (f) {
    case "open": return bar.open;
    case "high": return bar.high;
    case "low": return bar.low;
    case "close": return bar.close;
    case "volume": return bar.volume;
    // No intraday data: the typical price stands in for the day's VWAP.
    case "vwap": return (bar.high + bar.low + bar.close) / 3;
    case "returns": return i > 0 ? bar.close / candles[i - 1].close - 1 : NaN;
    case "price": return i === n - 1 ? price : bar.close;
    case "bar": return i + 1;
  }
}

/**
 * Engine bridge: an `OnBar` for the existing GameEngine. Each bot gets its own
 * evaluator, keyed by the per-bot state object the engine passes in.
 */
export function strategyOnBar(def: StrategyDef, overrides: Record<string, number> = {}): OnBar {
  const compiled = compileStrategy(def, overrides);
  const evaluators = new WeakMap<object, Evaluator>();
  return (ctx, pos, state) => {
    let ev = evaluators.get(state);
    if (!ev) {
      ev = compiled.instantiate();
      evaluators.set(state, ev);
    }
    ev.update(ctx.candles, ctx.price);
    return ev.decide(pos?.side ?? null);
  };
}
