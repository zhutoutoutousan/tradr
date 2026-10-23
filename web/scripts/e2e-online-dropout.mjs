// A player's connection drops for a while (phone in background, scanning a QR with
// the system camera, flaky network). After it comes back everyone must see each
// other again and chat must flow both ways.
// Usage: BASE=http://localhost:3100 node scripts/e2e-online-dropout.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const OFFLINE_MS = Number(process.env.OFFLINE_MS || 40000);
// While true, guest 1's realtime socket silently drops every frame in both directions.
let blackhole = false;
const room = 'D' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
const browser = await chromium.launch();
const ctxs = [];
async function join(name, mobile) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  ctxs.push(ctx);
  const p = await ctx.newPage();
  if (name === 'GuestD1') {
    await p.routeWebSocket(/realtime/, (ws) => {
      const server = ws.connectToServer();
      ws.onMessage((m) => { if (!blackhole) server.send(m); });
      server.onMessage((m) => { if (!blackhole) ws.send(m); });
      ws.onClose((code, reason) => server.close({ code, reason }));
      server.onClose((code, reason) => ws.close({ code, reason }));
    });
  }
  p.on('console', (m) => { const t = m.text(); if (/\[MP\]|subscribe/i.test(t)) console.log(`  [${name}] ${t.slice(0, 160)}`); });
  p.on('pageerror', (e) => console.log(`  [${name}] pageerror ${e.message}`));
  await p.goto(`${BASE}/multiplayer?room=${room}`, { waitUntil: 'networkidle' });
  await p.fill('input[placeholder="Trader"]', name);
  await p.click('button:has-text("Join room")');
  await p.waitForSelector(`text=room ${room}`, { timeout: 20000 });
  return p;
}
const host = await join('HostD');
const g1 = await join('GuestD1', true);
const g2 = await join('GuestD2', true);
const pages = [host, g1, g2];
await Promise.all(pages.map((p) => p.waitForSelector('text=In this room · 3', { timeout: 20000 })));
console.log('all joined, guest 1 connection goes dead');
blackhole = true;
await host.waitForTimeout(OFFLINE_MS);
blackhole = false;
console.log('guest 1 back online');

const seen = await Promise.all(pages.map((p) => p.waitForSelector('text=In this room · 3', { timeout: 45000 }).then(() => 1, () => 0)));
console.log(`all see 3 players again: ${seen.join('')}`);
await host.fill('input[placeholder^="Message"]', 'bist du wieder da');
await host.press('input[placeholder^="Message"]', 'Enter');
const toG1 = await g1.waitForFunction(() => document.body.textContent.includes('bist du wieder da'), null, { timeout: 10000 }).then(() => 1, () => 0);
const open = g1.locator('button[aria-label="Open chat"]');
if (await open.isVisible().catch(() => false)) await open.click();
await g1.locator('input[placeholder^="Message"]:visible').first().fill('ja wieder da');
await g1.locator('input[placeholder^="Message"]:visible').first().press('Enter');
const fromG1 = await host.waitForFunction(() => document.body.textContent.includes('ja wieder da'), null, { timeout: 10000 }).then(() => 1, () => 0);
console.log(`chat host->guest1: ${toG1}, guest1->host: ${fromG1}`);
await browser.close();
const ok = seen.every(Boolean) && toG1 && fromG1;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
