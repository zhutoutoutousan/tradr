// Three-device local multiplayer: host pairs guest 1, then adds guest 2 from the
// lobby. Everyone votes for the same market, the race runs on it on all devices,
// chat is relayed through the host, and guest 2 (whose market download is
// blocked) receives the candles from the host over the data channel.
// Usage: BASE=http://localhost:3100 node scripts/e2e-local-mp-multi.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const MARKET = process.env.MARKET || 'btcusd';
const browsers = [];

async function launch(label) {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  browsers.push(browser);
  const context = await browser.newContext({ permissions: ['camera'], serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(`  [${label}] pageerror ${e.message}`));
  return page;
}

async function enter(page, role, name) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.evaluate((n) => localStorage.setItem('tradr.localmp.username', n), name);
  await page.click('[data-testid="mode-local-multiplayer"]');
  await page.click(role === 'host' ? 'button:has-text("Spiel erstellen")' : 'button:has-text("Spiel beitreten")');
}

async function pair(host, guest, scope = host) {
  const offer = await scope.locator('[data-testid="local-mp-offer"]').last().getAttribute('data-code', { timeout: 20000 });
  await guest.click('button:has-text("⌨️ Manuell")');
  await guest.fill('input[placeholder="Code hier einfügen..."]', offer);
  await guest.click('button:has-text("Beitreten")');
  const answer = await guest.locator('[data-testid="local-mp-answer"]').getAttribute('data-code', { timeout: 20000 });
  await host.locator('button:has-text("⌨️ Manuell")').last().click();
  await host.locator('input[placeholder="Antwort-Code hier einfügen..."]').last().fill(answer);
  await host.locator('button:has-text("Verbinden")').last().click();
}

const fail = async (msg) => {
  console.log(`FAIL: ${msg}`);
  await Promise.all(browsers.map((b) => b.close()));
  process.exit(1);
};

const host = await launch('host');
const g1 = await launch('g1');
const g2 = await launch('g2');
let chunked = false;
await g2.route(`**/data/${MARKET}.json`, (route) => {
  chunked = true;
  return route.abort();
});

await enter(host, 'host', 'HostPhone');
await enter(g1, 'join', 'GuestOne');
await pair(host, g1);
const lobby1 = await host.waitForSelector('[data-testid="local-mp-add-player"]', { timeout: 20000 }).then(() => true, () => false);
console.log(`host in lobby after guest 1: ${lobby1}`);
if (!lobby1) await fail('host lobby');

await host.click('[data-testid="local-mp-add-player"]');
await enter(g2, 'join', 'GuestTwo');
await pair(host, g2);
const modalClosed = await host.waitForSelector('[data-testid="local-mp-add-modal"]', { state: 'detached', timeout: 20000 }).then(() => true, () => false);
console.log(`guest 2 added, modal closed: ${modalClosed}`);

const rosterOk = await Promise.all([host, g1, g2].map((p) =>
  p.waitForSelector('text=In this room · 3', { timeout: 15000 }).then(() => true, () => false)));
console.log(`all see 3 players: ${rosterOk.join(', ')}`);
if (!rosterOk.every(Boolean)) await fail('roster');

for (const p of [g1, g2, host]) {
  await p.waitForSelector(`[data-testid="vote-${MARKET}"]:not([disabled])`, { timeout: 15000 });
  await p.click(`[data-testid="vote-${MARKET}"]`);
}
const summary = await host.waitForFunction(
  () => /100%/.test(document.querySelector('[data-testid="vote-summary"]')?.textContent ?? ''),
  null, { timeout: 10000 }).then(() => true, () => false);
const g1Summary = await g1.textContent('[data-testid="vote-summary"]');
console.log(`host tally 100%: ${summary}; guest 1 sees: ${g1Summary}`);

await host.click('button:has-text("Start 3-minute race")');
const live = await Promise.all([host, g1, g2].map((p) =>
  p.waitForSelector('text=/Live · bar/', { timeout: 40000 }).then(() => true, () => false)));
console.log(`race running: ${live.join(', ')}; guest 2 market came via host: ${chunked}`);
if (!live.every(Boolean)) {
  await Promise.all([host, g1, g2].map((p, i) => p.screenshot({ path: `/tmp/multi-${i}.png` })));
  await fail('race start');
}

const labels = await Promise.all([host, g1, g2].map((p) => p.locator('main .text-xs.font-semibold').first().textContent()));
console.log(`markets: ${labels.join(' / ')}`);
const sameMarket = labels.every((l) => l === labels[0]) && /btc/i.test(labels[0]);

const msg = 'hallo von gast zwei';
await g2.locator('input[placeholder^="Message"]:visible').first().fill(msg);
await g2.locator('input[placeholder^="Message"]:visible').first().press('Enter');
const relayed = await Promise.all([host, g1].map((p) =>
  p.waitForFunction((t) => document.body.textContent.includes(t), msg, { timeout: 8000 }).then(() => true, () => false)));
console.log(`chat from guest 2 reached host: ${relayed[0]}, guest 1 (relayed): ${relayed[1]}`);

await host.waitForTimeout(1500);
const boards = await Promise.all([host, g1, g2].map((p) => p.textContent('body')));
const seeAll = boards[1].includes('HostPhone') && boards[1].includes('GuestTwo') && boards[2].includes('GuestOne');
const bars = await Promise.all([host, g1, g2].map((p) => p.textContent('text=/Live · bar \\d+/')));
console.log(`leaderboards list everyone: ${seeAll}; bars: ${bars.join(' / ')}`);
await Promise.all([host, g1, g2].map((p, i) => p.screenshot({ path: `/tmp/multi-${i}.png` })));

const ok = modalClosed && summary && sameMarket && relayed.every(Boolean) && seeAll && chunked;
await Promise.all(browsers.map((b) => b.close()));
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
