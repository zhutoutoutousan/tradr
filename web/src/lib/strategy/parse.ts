import type { Expr } from "./ast";

export class FormulaError extends Error {
  constructor(
    message: string,
    readonly pos: number,
  ) {
    super(message);
    this.name = "FormulaError";
  }
}

type Tok =
  | { t: "num"; v: number; pos: number }
  | { t: "id"; v: string; pos: number }
  | { t: "op"; v: string; pos: number }
  | { t: "end"; pos: number };

const OPS = ["<=", ">=", "==", "!=", "&&", "||", "+", "-", "*", "/", "^", "<", ">", "!", "?", ":", "(", ")", ","];

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const numMatch = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
    if (numMatch) {
      out.push({ t: "num", v: Number(numMatch[0]), pos: i });
      i += numMatch[0].length;
      continue;
    }
    const idMatch = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i));
    if (idMatch) {
      out.push({ t: "id", v: idMatch[0], pos: i });
      i += idMatch[0].length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new FormulaError(`Unexpected character "${ch}"`, i);
    out.push({ t: "op", v: op, pos: i });
    i += op.length;
  }
  out.push({ t: "end", pos: src.length });
  return out;
}

// Binding power of infix operators; ^ is right-associative.
const INFIX: Record<string, { bp: number; fn: string; right?: boolean }> = {
  "||": { bp: 2, fn: "or" },
  "&&": { bp: 3, fn: "and" },
  "==": { bp: 4, fn: "eq" },
  "!=": { bp: 4, fn: "ne" },
  "<": { bp: 5, fn: "lt" },
  ">": { bp: 5, fn: "gt" },
  "<=": { bp: 5, fn: "le" },
  ">=": { bp: 5, fn: "ge" },
  "+": { bp: 6, fn: "add" },
  "-": { bp: 6, fn: "sub" },
  "*": { bp: 7, fn: "mul" },
  "/": { bp: 7, fn: "div" },
  "^": { bp: 9, fn: "pow", right: true },
};
const PREFIX_BP = 8;
const TERNARY_BP = 1;

/** Parse one formula, e.g. `(-1 * correlation(open, volume, 10))`. */
export function parseFormula(src: string): Expr {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const expectOp = (v: string) => {
    const t = next();
    if (t.t !== "op" || t.v !== v) throw new FormulaError(`Expected "${v}"`, t.pos);
  };

  function primary(): Expr {
    const t = next();
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "id") {
      const nt = peek();
      if (nt.t === "op" && nt.v === "(") {
        next();
        const args: Expr[] = [];
        const close = peek();
        if (!(close.t === "op" && close.v === ")")) {
          for (;;) {
            args.push(expr(0));
            const sep = next();
            if (sep.t === "op" && sep.v === ")") break;
            if (!(sep.t === "op" && sep.v === ",")) throw new FormulaError('Expected "," or ")"', sep.pos);
          }
        } else next();
        return { k: "call", fn: t.v.toLowerCase(), args };
      }
      return { k: "id", name: t.v };
    }
    if (t.t === "op" && t.v === "(") {
      const e = expr(0);
      expectOp(")");
      return e;
    }
    if (t.t === "op" && (t.v === "-" || t.v === "+" || t.v === "!")) {
      const e = expr(PREFIX_BP);
      if (t.v === "+") return e;
      if (t.v === "-" && e.k === "num") return { k: "num", v: -e.v };
      return { k: "call", fn: t.v === "-" ? "neg" : "not", args: [e] };
    }
    throw new FormulaError(t.t === "end" ? "Formula ends too early" : "Unexpected token", t.pos);
  }

  function expr(minBp: number): Expr {
    let left = primary();
    for (;;) {
      const t = peek();
      if (t.t !== "op") break;
      if (t.v === "?") {
        if (TERNARY_BP < minBp) break;
        next();
        const a = expr(0);
        expectOp(":");
        const b = expr(TERNARY_BP);
        left = { k: "call", fn: "cond", args: [left, a, b] };
        continue;
      }
      const info = INFIX[t.v];
      if (!info || info.bp < minBp) break;
      next();
      const right = expr(info.right ? info.bp : info.bp + 1);
      left = { k: "call", fn: info.fn, args: [left, right] };
    }
    return left;
  }

  const e = expr(0);
  const end = peek();
  if (end.t !== "end") throw new FormulaError("Unexpected token after the formula", end.pos);
  return e;
}

const OP_TEXT: Record<string, string> = Object.fromEntries(
  Object.entries(INFIX).map(([sym, info]) => [info.fn, sym]),
);

/** Print a tree back as formula text; `parseFormula(printFormula(e))` round-trips. */
export function printFormula(e: Expr, parentBp = 0): string {
  if (e.k === "num") return e.v < 0 && parentBp > 0 ? `(${e.v})` : String(e.v);
  if (e.k === "id") return e.name;
  const sym = OP_TEXT[e.fn];
  if (sym && e.args.length === 2) {
    const info = INFIX[sym];
    const l = printFormula(e.args[0], info.right ? info.bp + 1 : info.bp);
    const r = printFormula(e.args[1], info.right ? info.bp : info.bp + 1);
    const s = `${l} ${sym} ${r}`;
    return info.bp < parentBp ? `(${s})` : s;
  }
  if ((e.fn === "neg" || e.fn === "not") && e.args.length === 1) {
    const s = `${e.fn === "neg" ? "-" : "!"}${printFormula(e.args[0], PREFIX_BP + 1)}`;
    return PREFIX_BP < parentBp ? `(${s})` : s;
  }
  if (e.fn === "cond" && e.args.length === 3) {
    const s = `${printFormula(e.args[0], TERNARY_BP + 1)} ? ${printFormula(e.args[1])} : ${printFormula(e.args[2], TERNARY_BP)}`;
    return TERNARY_BP < parentBp ? `(${s})` : s;
  }
  return `${e.fn}(${e.args.map((a) => printFormula(a)).join(", ")})`;
}
