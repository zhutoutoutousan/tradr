// The host's "Start 3-minute race" button must be on screen and tappable in the
// online lobby on small phones, large phones, landscape and desktop.
// Usage: BASE=http://localhost:3100 node scripts/e2e-lobby-start-visible.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3100';
const VIEWPORTS = [
  [320, 568], [375, 667], [390, 844], [430, 932], [667, 375], [844, 390], [1024, 768], [1280, 720], [1440, 900],
];
const browser = await chromium.launch();
let ok = true;
for (const [w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900 });
  const page = await ctx.newPage();
  const room = 'L' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  await page.goto(`${BASE}/multiplayer`, { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="Trader"]', 'Layout');
  await page.fill('input[placeholder="Auto-create"]', room);
  await page.click('button:has-text("Join room")');
  const btn = page.locator('button:has-text("Start 3-minute race")');
  await btn.waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  const box = await btn.boundingBox();
  const hit = await btn.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!top && (top === el || el.contains(top));
  });
  const inView = !!box && box.y >= 0 && box.y + box.height <= h && box.x >= 0 && box.x + box.width <= w;
  console.log(`${w}x${h}: in view ${inView}, tappable ${hit}${box ? ` (y ${Math.round(box.y)}-${Math.round(box.y + box.height)})` : ''}`);
  await page.screenshot({ path: `/tmp/lobby-${w}x${h}.png` });
  ok &&= inView && hit;
  await ctx.close();
}
await browser.close();
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
