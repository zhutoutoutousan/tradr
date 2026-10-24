// Strategy definitions are stored as formula text (Alpha101-style syntax) and
// parsed into this tree. The block editor, the formula editor and the compiler
// all work on the same tree, so a strategy built with blocks can be read as a
// formula and vice versa.

export type Expr =
  | { k: "num"; v: number }
  | { k: "id"; name: string }
  | { k: "call"; fn: string; args: Expr[] };

export interface ParamSpec {
  default: number;
  min?: number;
  max?: number;
  step?: number;
  /** Rounded to an integer when optimizing (windows, periods). */
  int?: boolean;
}

/**
 * A complete rule-based bot. Every formula is evaluated on bar close over the
 * closed candles. Entries are only checked while flat (long first), exits only
 * for the side currently held; stops are handled by the engine.
 */
export interface StrategyDef {
  v: 1;
  name: string;
  blurb?: string;
  params?: Record<string, ParamSpec>;
  /** Named series, usable by later definitions and by every rule. */
  let?: Record<string, string>;
  /** Gate for all decisions (e.g. warm-up: `bar > 30`). */
  when?: string;
  long?: string;
  short?: string;
  exitLong?: string;
  exitShort?: string;
  /** Stop-loss / take-profit as a fraction of entry; numbers or param formulas. */
  slPct?: number | string;
  tpPct?: number | string;
}

export const num = (v: number): Expr => ({ k: "num", v });
export const id = (name: string): Expr => ({ k: "id", name });
export const call = (fn: string, ...args: Expr[]): Expr => ({ k: "call", fn, args });
