// Online room across a rematch: after round 1 the host plays again, switches the
// pick mode and starts round 2. Every player must follow into round 2.
// Usage: BASE=http://localhost:3100 node scripts/e2e-online-rematch.mjs   (~4 minutes)
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const N = Number(process.env.N || 3);
const room = 'Q' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
const browser = await chromium.launch();
const pages = [];
for (let i = 0; i < N; i++) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: i ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/multiplayer`, { waitUntil: 'networkidle' });
  await p.fill('input[placeholder="Trader"]', `R${i}`);
  await p.fill('input[placeholder="Auto-create"]', room);
  await p.click('button:has-text("Join room")');
  await p.waitForSelector(`text=room ${room}`, { timeout: 20000 });
  pages.push(p);
  await p.waitForTimeout(700);
}
const [host, ...guests] = pages;
await host.waitForSelector(`text=In this room · ${N}`, { timeout: 30000 });
const all = (sel, timeout) => Promise.all(pages.map((p) => p.waitForSelector(sel, { timeout }).then(() => 1, () => 0)));
const report = (label, arr) => console.log(`${arr.every(Boolean) ? 'PASS' : 'FAIL'} ${label}: ${arr.join('')}`);

await host.click('button:has-text("Start 3-minute race")');
const r1 = await all('text=/Live · bar/', 30000);
report('round 1 running', r1);
const over = await all('[data-testid="mp-game-over"]', 200000);
report('round 1 results', over);

await host.click('button:has-text("Play again in this room")');
const lobby = await Promise.all(guests.map((p) => p.waitForSelector('text=Waiting for the host to start…', { timeout: 20000 }).then(() => 1, () => 0)));
report('guests back in lobby', lobby);
await host.waitForTimeout(3000);
await host.click('[data-testid="pick-mode-host"]');
const mode = await Promise.all(guests.map((p) => p.waitForFunction(() => /Host picks/.test(document.body.textContent), null, { timeout: 10000 }).then(() => 1, () => 0)));
report('round 2 pick mode reached guests', mode);
await host.click('[data-testid="vote-nvda"]');
await host.waitForTimeout(1000);
await host.click('button:has-text("Start 3-minute race")');
const r2 = await all('text=/Live · bar/', 30000);
report('round 2 running', r2);
const labels = await Promise.all(pages.map((p) => p.locator('main .text-xs.font-semibold').first().textContent().catch(() => '?')));
console.log(`round 2 markets: ${labels.join(' / ')}`);
await Promise.all(pages.map((p, i) => p.screenshot({ path: `/tmp/rematch-${i}.png` })));
await browser.close();
process.exit([...r1, ...over, ...lobby, ...mode, ...r2].every(Boolean) && labels.every((l) => /NVDA/.test(l)) ? 0 : 1);
