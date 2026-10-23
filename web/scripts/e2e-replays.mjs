// Replays + account history end to end.
//   solo:  signed-in solo round -> account XP/ELO row -> replay page -> viewer danmaku
//   mp:    signed-in host + guest race (3 min) with trades and chat -> results QR popup
//          fully on screen -> shared replay contains both humans, bots and the chat
// Usage: BASE=http://localhost:3100 E2E_EMAIL=... E2E_PASSWORD=... MODE=solo|mp|all node scripts/e2e-replays.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const MODE = process.env.MODE || 'all';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const OUT = process.env.OUT || '/tmp';
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function newPage(browser, { viewport = { width: 1280, height: 860 }, roundMs } = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport });
  await context.addInitScript((ms) => {
    localStorage.setItem('tradr.tutorial.v1', '1');
    if (ms) localStorage.setItem('tradr.demo.roundMs', String(ms));
    localStorage.setItem('tradr.demo.noBust', '1');
  }, roundMs ?? 0);
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  return page;
}

async function signIn(page) {
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  const toLogin = page.getByRole('button', { name: /Already have an account/i });
  if (await toLogin.isVisible().catch(() => false)) await toLogin.click();
  await page.fill('input[type=email]', EMAIL);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/register'), { timeout: 20000 });
}

async function checkReplayPage(page, label, { expectChat, expectHumans = 0 } = {}) {
  await page.waitForSelector('[data-testid="replay-player"]', { timeout: 20000 });
  const rows = await page.locator('[data-testid="replay-leaderboard"] .space-y-1 > div').count();
  check(`${label}: replay leaderboard rows`, rows >= 6 + expectHumans, `${rows} rows`);
  const clock0 = await page.textContent('[data-testid="replay-clock"]');
  await page.waitForTimeout(2500);
  const clock1 = await page.textContent('[data-testid="replay-clock"]');
  check(`${label}: replay plays`, clock0 !== clock1, `${clock0} -> ${clock1}`);
  // Jump to the end so every recorded chat message is in the side list.
  const max = await page.getAttribute('[data-testid="replay-scrubber"]', 'max');
  await page.locator('[data-testid="replay-scrubber"]').fill(max);
  await page.waitForTimeout(500);
  if (expectChat) {
    const chat = await page.textContent('[data-testid="replay-chat"]');
    check(`${label}: recorded chat in replay`, chat.includes(expectChat), chat.slice(0, 120));
  }
  // Viewer danmaku at a point in the middle of the round.
  const min = await page.getAttribute('[data-testid="replay-scrubber"]', 'min');
  await page.locator('[data-testid="replay-scrubber"]').fill(String(Math.floor((Number(min) + Number(max)) / 2)));
  const text = `viewer-${Date.now() % 100000}`;
  await page.fill('[data-testid="replay-viewer-name"]', 'Watcher');
  await page.fill('[data-testid="replay-danmaku-input"]', text);
  await page.click('[data-testid="replay-danmaku-send"]');
  const flew = await page.waitForSelector(`[data-testid="replay-danmaku"] >> text=${text}`, { timeout: 8000 }).then(() => true, () => false);
  check(`${label}: viewer danmaku flies`, flew);
  await page.screenshot({ path: `${OUT}/replay-${label}.png` });
  // A fresh viewer sees the stored comment.
  const other = await newPage(page.context().browser());
  await other.goto(page.url(), { waitUntil: 'networkidle' });
  await other.waitForSelector('[data-testid="replay-player"]', { timeout: 20000 });
  await other.locator('[data-testid="replay-scrubber"]').fill(max);
  const seen = await other.waitForSelector(`[data-testid="replay-chat"] >> text=${text}`, { timeout: 10000 }).then(() => true, () => false);
  check(`${label}: second viewer sees stored danmaku`, seen);
  await other.context().close();
}

async function solo(browser) {
  const page = await newPage(browser, { roundMs: 15000 });
  await signIn(page);
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.getByTestId('mode-solo').click();
  await page.getByRole('button', { name: /long/i }).first().waitFor({ timeout: 30000 });
  await page.keyboard.press('b');
  await page.waitForTimeout(3000);
  await page.keyboard.press('c');
  await page.waitForTimeout(1000);
  await page.keyboard.press('s');
  await page.getByTestId('game-over-modal').waitFor({ timeout: 40000 });
  const acct = await page.waitForSelector('[data-testid="account-result"]', { timeout: 15000 }).then(() => true, () => false);
  check('solo: account XP/ELO shown on results', acct, acct ? await page.textContent('[data-testid="account-result"]') : '');
  const link = await page.waitForSelector('[data-testid="watch-replay"]', { timeout: 15000 }).then(() => true, () => false);
  check('solo: watch replay link', link);
  await page.screenshot({ path: `${OUT}/solo-results.png` });
  if (!link) return;
  await page.click('[data-testid="watch-replay"]');
  await checkReplayPage(page, 'solo');

  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="profile-xp"]', { timeout: 15000 });
  const replayLinks = await page.locator('a:has-text("Replay")').count();
  check('solo: profile shows history with replay link', replayLinks > 0, `${replayLinks} replay links`);
  await page.screenshot({ path: `${OUT}/profile.png`, fullPage: true });
  await page.context().close();
}

async function mp(browser) {
  const room = 'R' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const host = await newPage(browser);
  await signIn(host);
  const guest = await newPage(browser, { viewport: { width: 390, height: 844 } });
  for (const [p, name] of [[host, 'HostRep'], [guest, 'GuestRep']]) {
    await p.goto(`${BASE}/multiplayer`, { waitUntil: 'networkidle' });
    await p.fill('input[placeholder="Trader"]', name);
    await p.fill('input[placeholder="Auto-create"]', room);
    await p.click('button:has-text("Join room")');
    await p.waitForSelector(`text=room ${room}`, { timeout: 20000 });
  }
  await host.waitForSelector('text=GuestRep', { timeout: 20000 });
  await host.click('button:has-text("Start 3-minute race")');
  await host.waitForTimeout(6000);
  console.log(`race started in ${room}`);

  await host.keyboard.press('b');
  await guest.keyboard.press('s');
  await host.waitForTimeout(4000);
  const chatInput = host.locator('input[placeholder^="Message"]').first();
  await chatInput.fill('gl hf from host');
  await chatInput.press('Enter');
  await host.waitForTimeout(20000);
  await host.keyboard.press('c');
  await guest.keyboard.press('c');

  await host.waitForSelector('[data-testid="mp-game-over"]', { timeout: 200000 });
  await guest.waitForSelector('[data-testid="mp-game-over"]', { timeout: 30000 });
  const acct = await host.waitForSelector('[data-testid="account-result"]', { timeout: 20000 }).then(() => true, () => false);
  check('mp: host account XP/ELO shown', acct, acct ? await host.textContent('[data-testid="account-result"]') : '');
  const link = await host.waitForSelector('[data-testid="watch-replay"]', { timeout: 20000 }).then(() => true, () => false);
  check('mp: watch replay link (host)', link);
  const guestLink = await guest.waitForSelector('[data-testid="watch-replay"]', { timeout: 20000 }).then(() => true, () => false);
  check('mp: watch replay link (guest)', guestLink);

  // Results-screen QR popup must be fully on screen (desktop + phone).
  for (const [p, label] of [[host, 'desktop'], [guest, 'phone']]) {
    await p.locator('[data-testid="mp-game-over"] button:has-text("QR Code")').click();
    const modal = p.locator('[data-testid="share-qr-modal"] > div').first();
    await modal.waitFor({ timeout: 5000 });
    const box = await modal.boundingBox();
    const vp = p.viewportSize();
    const inside = box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1;
    check(`mp: results QR popup fully visible (${label})`, !!inside, JSON.stringify(box));
    await p.screenshot({ path: `${OUT}/mp-results-qr-${label}.png` });
    await p.locator('[data-testid="share-qr-modal"] [aria-label="Close"]').first().click({ timeout: 5000 });
  }

  if (link) {
    await host.click('[data-testid="watch-replay"]');
    await checkReplayPage(host, 'mp', { expectChat: 'gl hf from host', expectHumans: 1 });
    const names = await host.textContent('[data-testid="replay-leaderboard"]');
    check('mp: replay includes both humans', names.includes('HostRep') && names.includes('GuestRep'), names.slice(0, 160));
  }
  await host.context().close();
  await guest.context().close();
}

const browser = await chromium.launch();
try {
  if (MODE === 'solo' || MODE === 'all') await solo(browser);
  if (MODE === 'mp' || MODE === 'all') await mp(browser);
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
