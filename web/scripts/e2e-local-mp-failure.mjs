// Local multiplayer when the devices can't reach each other (codes exchanged,
// but every candidate is unreachable): both sides must leave the QR screens
// with a failure explanation and a working retry instead of waiting forever.
// Usage: BASE=http://localhost:3100 node scripts/e2e-local-mp-failure.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const unreachable = (code) => code.split('~').map((p, i) => (i >= 8 ? 'h192.0.2.1,9' : p)).join('~');

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
async function open(role, name) {
  const ctx = await browser.newContext({ permissions: ['camera'], serviceWorkers: 'block', viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (/trouble|candidates/.test(m.text())) console.log(`  [${role}] ${m.text().split('\n')[0]}`); });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.click('[data-testid="mode-local-multiplayer"]');
  await page.click(role === 'host' ? 'button:has-text("Spiel erstellen")' : 'button:has-text("Spiel beitreten")');
  const input = page.locator('input[placeholder="Dein Spielername..."]');
  if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
    await input.fill(name);
    await page.click('button:has-text("Weiter")');
  }
  return page;
}

const host = await open('host', 'HostFail');
const offer = await (await host.waitForSelector('[data-testid="local-mp-offer"]', { timeout: 20000 })).getAttribute('data-code');
const guest = await open('guest', 'GuestFail');
await guest.click('button:has-text("Manuell")');
await guest.fill('input[placeholder="Code hier einfügen..."]', unreachable(offer));
await guest.click('button:has-text("Beitreten")');
const answer = await (await guest.waitForSelector('[data-testid="local-mp-answer"]', { timeout: 20000 })).getAttribute('data-code');
await host.click('button:has-text("Manuell")');
await host.fill('input[placeholder="Antwort-Code hier einfügen..."]', unreachable(answer));
await host.click('button:has-text("Verbinden")');

const connecting = await host.waitForSelector('[data-testid="local-mp-connecting"]', { timeout: 5000 }).then(() => true, () => false);
console.log(`host left the QR screen for "connecting": ${connecting}`);
const t0 = Date.now();
const hostTrouble = await host.waitForSelector('[data-testid="local-mp-trouble"]', { timeout: 40000 }).then(() => true, () => false);
console.log(`host shows failure help: ${hostTrouble} after ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`  diagnostics: ${await host.textContent('[data-testid="local-mp-diagnostics"]').catch(() => '-')}`);
await host.screenshot({ path: '/tmp/local-mp-trouble-host.png' });
const guestHelp = await guest.waitForSelector('[data-testid="local-mp-trouble"], [data-testid="local-mp-slow"]', { timeout: 60000 }).then(() => true, () => false);
console.log(`guest shows failure help: ${guestHelp}`);
await guest.screenshot({ path: '/tmp/local-mp-trouble-guest.png' });

await host.click('[data-testid="local-mp-retry"]');
const newOffer = await (await host.waitForSelector('[data-testid="local-mp-offer"]', { timeout: 20000 })).getAttribute('data-code');
const fresh = newOffer && newOffer !== offer;
console.log(`host retry shows a new offer QR: ${fresh}`);
await browser.close();
process.exit(connecting && hostTrouble && guestHelp && fresh ? 0 : 1);
