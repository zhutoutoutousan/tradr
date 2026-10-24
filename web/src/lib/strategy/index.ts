export type { Expr, ParamSpec, StrategyDef } from "./ast";
export { parseFormula, printFormula, FormulaError } from "./parse";
export { OPS, FIELDS } from "./ops";
export { compileStrategy, strategyOnBar, resolveParams, Evaluator, StrategyError, type CompiledStrategy } from "./compile";
export { backtest, optimize, type BacktestMetrics, type BacktestResult, type BacktestTrade } from "./backtest";
export { BUILTIN_STRATEGIES } from "./builtins";
