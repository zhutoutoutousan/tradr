// Online room membership survives leaving and re-entering the same room inside the
// app (no page reload): host and both guests must see each other and get chat.
// Usage: BASE=http://localhost:3100 node scripts/e2e-online-rejoin.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const room = 'W' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
const browser = await chromium.launch();

async function open(name, mobile) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  return p;
}
async function joinInApp(p, name) {
  await p.click('[data-testid="mode-multiplayer"]');
  await p.fill('input[placeholder="Trader"]', name);
  await p.fill('input[placeholder="Auto-create"]', room);
  await p.click('button:has-text("Join room")');
  await p.waitForSelector(`text=room ${room}`, { timeout: 20000 });
}

const host = await open('host');
await joinInApp(host, 'HostW');
const g1 = await open('g1', true);
await joinInApp(g1, 'GuestW1');
const g2 = await open('g2', true);
await joinInApp(g2, 'GuestW2');
await g1.waitForTimeout(1500);
// Guest 1 leaves and comes straight back into the same room.
await g1.click('button:has-text("Leave")');
await joinInApp(g1, 'GuestW1');

const pages = [host, g1, g2];
const seen = await Promise.all(pages.map((p) => p.waitForSelector('text=In this room · 3', { timeout: 20000 }).then(() => 1, () => 0)));
console.log(`all see 3 players: ${seen.join('')}`);
const names = await Promise.all(pages.map((p) => p.textContent('body')));
const everyone = names.every((t) => t.includes('HostW') && t.includes('GuestW1') && t.includes('GuestW2'));
console.log(`names visible everywhere: ${everyone}`);

await host.fill('input[placeholder^="Message"]', 'hallo zurück');
await host.press('input[placeholder^="Message"]', 'Enter');
const chat = await Promise.all([g1, g2].map((p) => p.waitForFunction(() => document.body.textContent.includes('hallo zurück'), null, { timeout: 8000 }).then(() => 1, () => 0)));
console.log(`chat reached rejoined guest / other guest: ${chat.join(' / ')}`);
await browser.close();
const ok = seen.every(Boolean) && everyone && chat.every(Boolean);
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
