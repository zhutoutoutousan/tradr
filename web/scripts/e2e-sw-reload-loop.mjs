// Counts page reloads caused by the service worker over a fixed window.
// A healthy app reloads at most once (first install); the bug reloads forever.
// Usage: BASE=https://tradr-sigma.vercel.app node scripts/e2e-sw-reload-loop.mjs
import { chromium, webkit, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const WINDOW_MS = Number(process.env.WINDOW_MS || 30000);
const MAX_RELOADS = Number(process.env.MAX_RELOADS || 1);

const engine = process.env.ENGINE === 'webkit' ? webkit : chromium;
const device = process.env.ENGINE === 'webkit' ? devices['iPhone 14'] : devices['Pixel 7'];
const context = await engine.launchPersistentContext('/tmp/sw-loop-profile-' + Date.now(), { ...device });
const page = context.pages()[0] ?? await context.newPage();
let loads = 0;
page.on('load', () => { loads++; console.log(`  load #${loads} at ${new Date().toISOString().slice(11, 19)}`); });
page.on('console', (m) => { if (/\[PWA\].*(reload|Unregister|registered)/i.test(m.text())) console.log(`  ${m.text().split('\n')[0].slice(0, 100)}`); });

async function phase(name, before) {
  await page.waitForTimeout(WINDOW_MS);
  const reloads = loads - before - 1;
  console.log(`${name}: ${reloads} reload(s)`);
  return reloads;
}

await page.goto(BASE + '/');
const first = await phase('first visit', 0);
const beforeSecond = loads;
await page.reload();
const second = await phase('returning visit', beforeSecond);
await context.close();
process.exit(first <= MAX_RELOADS && second <= 0 ? 0 : 1);
