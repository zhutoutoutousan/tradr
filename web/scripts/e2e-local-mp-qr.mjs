// End-to-end test of the local multiplayer QR handshake with a fake camera.
// Host shows the offer QR -> screenshot -> degraded "camera" video -> guest scans it,
// then the same for the guest's answer QR -> host scans it -> both must connect.
// Usage: BASE=http://localhost:3100 node scripts/e2e-local-mp-qr.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE || 'http://localhost:3100';
const QR_HEIGHT = Number(process.env.QR_HEIGHT || 300); // QR size inside a 1280x720 camera frame
const BLUR = process.env.BLUR || '1.2';

function makeCameraVideo(png, out) {
  // Grey background, QR scaled down, blurred and noisy, like a phone filming another screen.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x606060:s=1280x720:d=2:r=10', '-i', png,
    '-filter_complex', `[1:v]scale=-1:${QR_HEIGHT}[q];[0:v][q]overlay=(W-w)/2:(H-h)/2,gblur=sigma=${BLUR},noise=alls=12:allf=t,format=yuv420p`,
    '-frames:v', '20', out]);
}

async function launch(video) {
  const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    '--disable-features=WebRtcHideLocalIpsWithMdns'];
  if (video) args.push(`--use-file-for-fake-video-capture=${video}`);
  const browser = await chromium.launch({ args });
  const context = await browser.newContext({ permissions: ['camera'], serviceWorkers: 'block', viewport: { width: 420, height: 900 } });
  const page = await context.newPage();
  page.on('console', (m) => { const t = m.text(); if (/LocalMP|WebRTC\]/.test(t)) console.log(`  [${video ? 'cam' : 'page'}] ${t.split('\n')[0]}`); });
  return { browser, page };
}

async function enterLocalMp(page, role, name) {
  await page.goto(`${BASE}/`);
  await page.click('[data-testid="mode-local-multiplayer"]');
  await page.click(role === 'host' ? 'button:has-text("Spiel erstellen")' : 'button:has-text("Spiel beitreten")');
  const input = page.locator('input[placeholder="Dein Spielername..."]');
  if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
    await input.fill(name);
    await page.click('button:has-text("Weiter")');
  }
}

async function qrScreenshot(page, path) {
  const qr = page.locator('div.bg-white:has(svg)').first();
  await qr.waitFor({ timeout: 20000 });
  await qr.screenshot({ path });
  return page.evaluate(() => document.querySelector('div.bg-white svg')?.getAttribute('viewBox'));
}

const host = await launch('/tmp/answer-cam.y4m');
await enterLocalMp(host.page, 'host', 'HostPhone');
const offerViewBox = await qrScreenshot(host.page, '/tmp/offer-qr.png');
console.log(`offer QR modules: ${offerViewBox}`);
makeCameraVideo('/tmp/offer-qr.png', '/tmp/offer-cam.y4m');

const guest = await launch('/tmp/offer-cam.y4m');
await enterLocalMp(guest.page, 'join', 'GuestPhone');
await guest.page.click('button:has-text("Kamera starten")');
const scanned = await guest.page.waitForSelector('text=Antwort-Code erstellt', { timeout: 30000 }).then(() => true, () => false);
console.log(`guest decoded host QR: ${scanned}`);
if (!scanned) {
  await guest.page.screenshot({ path: '/tmp/guest-fail.png' });
  await Promise.all([host.browser.close(), guest.browser.close()]);
  process.exit(1);
}

const answerViewBox = await qrScreenshot(guest.page, '/tmp/answer-qr.png');
console.log(`answer QR modules: ${answerViewBox}`);
makeCameraVideo('/tmp/answer-qr.png', '/tmp/answer-cam.y4m');

await host.page.click('button:has-text("Antwort-QR-Code scannen")');
const connected = await Promise.all([
  host.page.waitForEvent('console', { predicate: (m) => m.text().includes('Data channel open'), timeout: 30000 }).then(() => true, () => false),
  guest.page.waitForEvent('console', { predicate: (m) => m.text().includes('Data channel open'), timeout: 30000 }).then(() => true, () => false),
]);
console.log(`host connected: ${connected[0]}, guest connected: ${connected[1]}`);
await host.page.waitForTimeout(1500);
await host.page.screenshot({ path: '/tmp/host-after.png' });
await guest.page.screenshot({ path: '/tmp/guest-after.png' });
await Promise.all([host.browser.close(), guest.browser.close()]);
process.exit(connected.every(Boolean) ? 0 : 1);
