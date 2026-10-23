// Online room market vote: three players vote (2x ETH, 1x AAPL). The host's start
// draws one of the voted markets (weighted) and every client must race it.
// Usage: BASE=http://localhost:3100 node scripts/e2e-online-vote.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const room = 'V' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
const browser = await chromium.launch();
const pages = [];
for (const name of ['VoteHost', 'VoteA', 'VoteB']) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/multiplayer`, { waitUntil: 'networkidle' });
  await p.fill('input[placeholder="Trader"]', name);
  await p.fill('input[placeholder="Auto-create"]', room);
  await p.click('button:has-text("Join room")');
  await p.waitForSelector(`text=room ${room}`, { timeout: 20000 });
  pages.push(p);
  await p.waitForTimeout(800);
}
const [host, a, b] = pages;
await host.waitForSelector('text=VoteB', { timeout: 20000 });

for (const [p, id] of [[host, 'ethusd'], [a, 'ethusd'], [b, 'aapl']]) {
  await p.click(`[data-testid="vote-${id}"]`);
}
const tally = await host.waitForFunction(
  () => /67%/.test(document.querySelector('[data-testid="vote-summary"]')?.textContent ?? ''),
  null, { timeout: 15000 }).then(() => true, () => false);
console.log(`host tally: ${await host.textContent('[data-testid="vote-summary"]')}`);
console.log(`guest B tally: ${await b.textContent('[data-testid="vote-summary"]')}`);

await host.click('button:has-text("Start 3-minute race")');
const live = await Promise.all(pages.map((p) => p.waitForSelector('text=/Live · bar/', { timeout: 30000 }).then(() => true, () => false)));
const labels = await Promise.all(pages.map((p) => p.locator('main .text-xs.font-semibold').first().textContent()));
console.log(`running: ${live.join(', ')}; markets: ${labels.join(' / ')}`);
await host.screenshot({ path: '/tmp/online-vote.png' });
const ok = tally && live.every(Boolean) && labels.every((l) => l === labels[0]) && /ETH|AAPL/i.test(labels[0]);
await browser.close();
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
