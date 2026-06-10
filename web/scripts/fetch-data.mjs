// Downloads free daily historical OHLC data from Yahoo Finance (no API key)
// and writes it to web/public/data/<id>.json for the game to replay.
//
// Usage:  node scripts/fetch-data.mjs
//
// Symbols mirror the markets traded by the cluster-latest EA:
// forex majors, gold, bitcoin and the US stocks.

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");
const RANGE = "5y";
const INTERVAL = "1d";
const MAX_BARS = 1600;

const SYMBOLS = [
  // Forex — majors & liquid crosses
  { id: "eurusd", yahoo: "EURUSD=X", name: "EUR/USD", kind: "forex" },
  { id: "gbpusd", yahoo: "GBPUSD=X", name: "GBP/USD", kind: "forex" },
  { id: "usdjpy", yahoo: "USDJPY=X", name: "USD/JPY", kind: "forex" },
  { id: "audusd", yahoo: "AUDUSD=X", name: "AUD/USD", kind: "forex" },
  { id: "usdcad", yahoo: "USDCAD=X", name: "USD/CAD", kind: "forex" },
  { id: "usdchf", yahoo: "USDCHF=X", name: "USD/CHF", kind: "forex" },
  { id: "nzdusd", yahoo: "NZDUSD=X", name: "NZD/USD", kind: "forex" },
  { id: "eurgbp", yahoo: "EURGBP=X", name: "EUR/GBP", kind: "forex" },
  { id: "eurjpy", yahoo: "EURJPY=X", name: "EUR/JPY", kind: "forex" },
  { id: "gbpjpy", yahoo: "GBPJPY=X", name: "GBP/JPY", kind: "forex" },
  { id: "audjpy", yahoo: "AUDJPY=X", name: "AUD/JPY", kind: "forex" },
  { id: "eurchf", yahoo: "EURCHF=X", name: "EUR/CHF", kind: "forex" },
  // Precious metals & energy
  { id: "xauusd", yahoo: "GC=F", name: "Gold (XAU/USD)", kind: "commodity" },
  { id: "xagusd", yahoo: "SI=F", name: "Silver (XAG/USD)", kind: "commodity" },
  { id: "xptusd", yahoo: "PL=F", name: "Platinum", kind: "commodity" },
  { id: "wtiusd", yahoo: "CL=F", name: "WTI Crude Oil", kind: "commodity" },
  { id: "brentusd", yahoo: "BZ=F", name: "Brent Crude Oil", kind: "commodity" },
  { id: "natgas", yahoo: "NG=F", name: "Natural Gas", kind: "commodity" },
  { id: "copper", yahoo: "HG=F", name: "Copper", kind: "commodity" },
  // Crypto
  { id: "btcusd", yahoo: "BTC-USD", name: "Bitcoin (BTC/USD)", kind: "crypto" },
  { id: "ethusd", yahoo: "ETH-USD", name: "Ethereum (ETH/USD)", kind: "crypto" },
  { id: "solusd", yahoo: "SOL-USD", name: "Solana (SOL/USD)", kind: "crypto" },
  // US stocks & index ETFs
  { id: "aapl", yahoo: "AAPL", name: "Apple (AAPL)", kind: "stock" },
  { id: "msft", yahoo: "MSFT", name: "Microsoft (MSFT)", kind: "stock" },
  { id: "nvda", yahoo: "NVDA", name: "NVIDIA (NVDA)", kind: "stock" },
  { id: "tsla", yahoo: "TSLA", name: "Tesla (TSLA)", kind: "stock" },
  { id: "googl", yahoo: "GOOGL", name: "Alphabet (GOOGL)", kind: "stock" },
  { id: "amzn", yahoo: "AMZN", name: "Amazon (AMZN)", kind: "stock" },
  { id: "meta", yahoo: "META", name: "Meta (META)", kind: "stock" },
  { id: "amd", yahoo: "AMD", name: "AMD (AMD)", kind: "stock" },
  { id: "jpm", yahoo: "JPM", name: "JPMorgan (JPM)", kind: "stock" },
  { id: "v", yahoo: "V", name: "Visa (V)", kind: "stock" },
  { id: "jnj", yahoo: "JNJ", name: "Johnson & Johnson (JNJ)", kind: "stock" },
  { id: "wmt", yahoo: "WMT", name: "Walmart (WMT)", kind: "stock" },
  { id: "spy", yahoo: "SPY", name: "S&P 500 (SPY)", kind: "stock" },
  { id: "qqq", yahoo: "QQQ", name: "Nasdaq 100 (QQQ)", kind: "stock" },
  { id: "coin", yahoo: "COIN", name: "Coinbase (COIN)", kind: "stock" },
];

async function fetchSymbol(sym) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    sym.yahoo,
  )}?range=${RANGE}&interval=${INTERVAL}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 tradr-data-importer" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(json?.chart?.error?.description || "no result");
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const rows = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    if (![o, h, l, c].every((v) => typeof v === "number" && Number.isFinite(v))) continue;
    rows.push({
      date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
      open: o,
      high: h,
      low: l,
      close: c,
      volume: Number.isFinite(q.volume?.[i]) ? q.volume[i] : 0,
    });
  }
  if (rows.length === 0) throw new Error("no parseable rows");
  return rows.slice(-MAX_BARS);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const index = [];
  for (const sym of SYMBOLS) {
    process.stdout.write(`Fetching ${sym.name} (${sym.yahoo})... `);
    try {
      const rows = await fetchSymbol(sym);
      const candles = rows.map((r, i) => ({
        time: i,
        date: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }));
      const payload = { id: sym.id, name: sym.name, kind: sym.kind, candles };
      await writeFile(join(OUT_DIR, `${sym.id}.json`), JSON.stringify(payload));
      index.push({
        id: sym.id,
        name: sym.name,
        kind: sym.kind,
        bars: candles.length,
        from: candles[0]?.date,
        to: candles[candles.length - 1]?.date,
      });
      console.log(`ok (${candles.length} bars, ${candles[0]?.date} -> ${candles[candles.length - 1]?.date})`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  await writeFile(join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));
  console.log(`\nWrote ${index.length} datasets to public/data/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
