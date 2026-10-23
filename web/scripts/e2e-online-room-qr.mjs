// Online multiplayer: a guest joins a room by scanning the host's room QR with
// a (fake) camera. Usage: BASE=http://localhost:3100 node scripts/e2e-online-room-qr.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE || 'http://localhost:3100';
const ROOM = 'Q' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');

async function launch(video) {
  const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
  if (video) args.push(`--use-file-for-fake-video-capture=${video}`);
  const browser = await chromium.launch({ args });
  const context = await browser.newContext({ permissions: ['camera'], serviceWorkers: 'block', viewport: { width: 420, height: 900 } });
  return { browser, page: await context.newPage() };
}

const host = await launch();
await host.page.goto(`${BASE}/multiplayer`, { waitUntil: 'networkidle' });
await host.page.fill('input[placeholder="Trader"]', 'HostQR');
await host.page.fill('input[placeholder="Auto-create"]', ROOM);
await host.page.click('button:has-text("Join room")');
await host.page.click('button:has-text("Share Room")');
await host.page.locator('#room-qr-code').screenshot({ path: '/tmp/room-qr.png' });
console.log(`host in room ${ROOM}, QR captured`);

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x606060:s=1280x720:d=2:r=10', '-i', '/tmp/room-qr.png',
  '-filter_complex', '[1:v]scale=-1:300[q];[0:v][q]overlay=(W-w)/2:(H-h)/2,gblur=sigma=1.2,noise=alls=12,format=yuv420p',
  '-frames:v', '20', '/tmp/room-cam.y4m']);

const guest = await launch('/tmp/room-cam.y4m');
await guest.page.goto(`${BASE}/multiplayer`, { waitUntil: 'networkidle' });
await guest.page.fill('input[placeholder="Trader"]', 'GuestQR');
await guest.page.click('[data-testid="scan-room-qr"]');
const inRoom = await guest.page.waitForSelector('[data-testid="qr-scan-modal"]', { state: 'detached', timeout: 20000 })
  .then(() => guest.page.waitForSelector(`text=room ${ROOM}`, { timeout: 10000 })).then(() => true, () => false);
const seesHost = inRoom && await guest.page.waitForSelector('text=HostQR', { timeout: 20000 }).then(() => true, () => false);
const hostSeesGuest = await host.page.waitForSelector('text=GuestQR', { timeout: 20000 }).then(() => true, () => false);
console.log(`guest joined ${ROOM} by scanning: ${inRoom}, guest sees host: ${seesHost}, host sees guest: ${hostSeesGuest}`);
await guest.page.screenshot({ path: '/tmp/guest-room.png' });
await Promise.all([host.browser.close(), guest.browser.close()]);
process.exit(inRoom && seesHost && hostSeesGuest ? 0 : 1);
