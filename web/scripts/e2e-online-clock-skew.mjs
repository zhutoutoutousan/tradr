// Online room with badly set phone clocks: guest 1 runs 2 minutes behind (and so
// "joined earliest" by its own clock), guest 2 runs 90 s ahead. Only the real host
// may switch Vote / I pick and start, and the start must reach everyone in sync.
// Usage: BASE=http://localhost:3100 node scripts/e2e-online-clock-skew.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const room = 'K' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
const browser = await chromium.launch();
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); };

async function join(name, skewMs, mobile) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  if (skewMs) await ctx.clock.install({ time: Date.now() + skewMs });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (/\[clock\]/.test(m.text())) console.log(`  [${name}] ${m.text()}`); });
  await p.goto(`${BASE}/multiplayer?room=${room}`, { waitUntil: 'networkidle' });
  await p.fill('input[placeholder="Trader"]', name);
  await p.click('button:has-text("Join room")');
  await p.waitForSelector(`text=room ${room}`, { timeout: 20000 });
  return p;
}

const host = await join('HostK', 0, false);
await host.waitForTimeout(1500);
const g1 = await join('SlowClock', -120_000, true);
const g2 = await join('FastClock', 90_000, true);
const pages = [host, g1, g2];
await Promise.all(pages.map((p) => p.waitForSelector('text=In this room · 3', { timeout: 20000 })));
await host.waitForTimeout(2000);

const toggles = await Promise.all(pages.map((p) => p.locator('[data-testid="pick-mode-host"]').count()));
check('only the host can switch Vote / I pick', toggles[0] === 1 && toggles[1] === 0 && toggles[2] === 0, toggles.join(','));
const startBtns = await Promise.all(pages.map((p) => p.locator('button:has-text("Start 3-minute race")').count()));
check('only the host has the start button', startBtns[0] === 1 && startBtns[1] === 0 && startBtns[2] === 0, startBtns.join(','));

for (const p of [g1, g2]) await p.click('[data-testid="vote-tsla"]');
check('guest votes reach host', await host.waitForFunction(() => /Tesla[^%]*100%/.test(document.querySelector('[data-testid="vote-summary"]')?.textContent ?? ''), null, { timeout: 10000 }).then(() => true, () => false));

await host.click('button:has-text("Start 3-minute race")');
const live = await Promise.all(pages.map((p) => p.waitForSelector('text=/Live · bar/', { timeout: 30000 }).then(() => 1, () => 0)));
check('race started on every device', live.every(Boolean), live.join(''));
await host.waitForTimeout(3000);
const bars = await Promise.all(pages.map((p) => p.textContent('text=/Live · bar \\d+/').then((t) => Number(t.match(/\d+/)[0])).catch(() => -1)));
check('devices on the same bar', Math.max(...bars) - Math.min(...bars) <= 2, bars.join(' / '));
const clocks = await Promise.all(pages.map((p) => p.locator('text=/⏱ \\d:\\d\\d/').first().textContent().catch(() => '?')));
console.log(`timers: ${clocks.join(' / ')}`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
