// Room QR invites: the in-room sidebar QR must invite players (not observers);
// people who arrive through an observer link show up in the lobby and can switch
// to trading.
// Usage: BASE=http://localhost:3100 node scripts/e2e-online-observer.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const room = 'O' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
const browser = await chromium.launch();
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); };
const page = async (mobile) => (await browser.newContext({ serviceWorkers: 'block', viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })).newPage();

const host = await page(false);
await host.goto(`${BASE}/multiplayer`, { waitUntil: 'networkidle' });
await host.fill('input[placeholder="Trader"]', 'HostO');
await host.fill('input[placeholder="Auto-create"]', room);
await host.click('button:has-text("Join room")');
await host.waitForSelector(`text=room ${room}`);

await host.locator('aside button:has-text("Share Room")').click();
const qrUrl = await host.locator('[data-testid="share-qr"]').getAttribute('data-url', { timeout: 5000 }).catch(() => '');
check('sidebar QR invites players', !!qrUrl && qrUrl.includes(`room=${room}`) && !qrUrl.includes('spectate'), qrUrl);
await host.keyboard.press('Escape');
await host.mouse.click(5, 5);

const obs = await page(true);
await obs.goto(`${BASE}/multiplayer?room=${room}&spectate=1`, { waitUntil: 'networkidle' });
await obs.fill('input[placeholder="Observer"]', 'Watcher');
await obs.click('button:has-text("Watch room")');
await obs.waitForSelector(`text=room ${room}`);
check('host sees the observer', await host.waitForSelector('[data-testid="lobby-observer"]:has-text("Watcher")', { timeout: 15000 }).then(() => true, () => false));
check('observer sees the host', await obs.waitForSelector('text=HostO', { timeout: 15000 }).then(() => true, () => false));

await obs.click('[data-testid="become-player"]');
check('switched observer trades', await host.waitForSelector('text=In this room · 2', { timeout: 20000 }).then(() => true, () => false));
check('observer list emptied', (await host.locator('[data-testid="lobby-observer"]').count()) === 0);
check('former observer sees vote panel', await obs.waitForSelector('[data-testid="market-vote"]', { timeout: 10000 }).then(() => true, () => false));
await host.click('button:has-text("Start 3-minute race")');
const live = await Promise.all([host, obs].map((p) => p.waitForSelector('text=/Live · bar/', { timeout: 30000 }).then(() => true, () => false)));
check('race runs for both', live.every(Boolean));
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
