// Online room: the host's "Vote / I pick" switch, the host's pick and the race
// start must reach the other players.
// Usage: BASE=http://localhost:3100 node scripts/e2e-online-pickmode.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const room = 'P' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
const browser = await chromium.launch();
const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function join(name, viewport) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport, isMobile: viewport.width < 900, hasTouch: viewport.width < 900 });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`  [${name}] ${m.text().slice(0, 200)}`); });
  await p.goto(`${BASE}/multiplayer`, { waitUntil: 'networkidle' });
  await p.fill('input[placeholder="Trader"]', name);
  await p.fill('input[placeholder="Auto-create"]', room);
  await p.click('button:has-text("Join room")');
  await p.waitForSelector(`text=room ${room}`, { timeout: 20000 });
  return p;
}

const summaryHas = (p, re, timeout = 10000) =>
  p.waitForFunction((src) => new RegExp(src).test(document.querySelector('[data-testid="market-vote"]')?.textContent ?? ''), re.source, { timeout })
    .then(() => true, () => false);

const host = await join('PickHost', { width: 1280, height: 900 });
await host.waitForTimeout(1500);
const guest = await join('PickGuest', { width: 390, height: 844 });
await host.waitForSelector('text=PickGuest', { timeout: 20000 });
check('guest is not host', !(await guest.locator('[data-testid="pick-mode-host"]').count()));

await host.click('[data-testid="pick-mode-host"]');
check('guest sees "Host picks"', await summaryHas(guest, /Host picks/));
await host.click('[data-testid="vote-aapl"]');
check('guest sees the host pick', await summaryHas(guest, /Host's pick: Apple/));
check('guest chips disabled in host mode', await guest.locator('[data-testid="vote-msft"]').isDisabled());

await host.click('[data-testid="pick-mode-vote"]');
check('guest sees vote mode again', await summaryHas(guest, /🗳️ Vote/));
await guest.click('[data-testid="vote-aapl"]');
check('host sees guest vote', await summaryHas(host, /Apple \(AAPL\)\s*100%/));

await host.click('button:has-text("Start 3-minute race")');
const live = await Promise.all([host, guest].map((p) => p.waitForSelector('text=/Live · bar/', { timeout: 30000 }).then(() => true, () => false)));
check('race started on host', live[0]);
check('race started on guest', live[1]);
const labels = await Promise.all([host, guest].map((p) => p.locator('main .text-xs.font-semibold').first().textContent().catch(() => '?')));
check('same market', labels[0] === labels[1] && /AAPL/.test(labels[0]), labels.join(' / '));
await guest.screenshot({ path: '/tmp/pick-guest.png' });
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
