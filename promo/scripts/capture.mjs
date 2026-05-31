// Captures real Tradr footage: high-res screenshots + a live trading screen
// recording. Requires the app running at http://localhost:3000.
import { chromium } from "playwright";
import { mkdirSync, readdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.PROMO_BASE || "http://localhost:3000";
const SHOTS = "public/shots";
const RECDIR = "public/rec";
mkdirSync(SHOTS, { recursive: true });
if (existsSync(RECDIR)) rmSync(RECDIR, { recursive: true, force: true });
mkdirSync(RECDIR, { recursive: true });

async function waitChart(page) {
  await page.waitForSelector("canvas", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1800);
}

async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  console.log("shot:", name);
}

const browser = await chromium.launch();

// --- Desktop screenshots (1600x900) ---
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, "landing");

  await page.goto(`${BASE}/play`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await waitChart(page);
  await shot(page, "play-desktop");
  // Open a long so the chart shows a position marker, then capture again.
  await page.getByRole("button", { name: /Long/ }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, "play-position");

  await page.goto(`${BASE}/multiplayer?room=PROMO`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(800);
  await page.getByPlaceholder(/Trader/).fill("Tradr").catch(() => {});
  await page.getByRole("button", { name: /Join room|Create room/ }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, "mp-lobby");

  await ctx.close();
}

// --- Mobile screenshots (390x844, iPhone-ish) ---
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/play`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await waitChart(page);
  await shot(page, "play-mobile");

  await page.goto(`${BASE}/multiplayer?room=PROMO`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(800);
  await page.getByPlaceholder(/Trader/).fill("You").catch(() => {});
  await page.getByRole("button", { name: /Join room|Create room/ }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, "mp-mobile");

  await ctx.close();
}

// --- Live screen recording of trading (1280x720) ---
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: RECDIR, size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/play`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await waitChart(page);
  // Drive a little trading story: Long -> wait -> Close -> Short -> wait -> Close.
  for (const label of [/Long/, /Close/, /Short/, /Close/]) {
    await page.getByRole("button", { name: label }).first().click().catch(() => {});
    await page.waitForTimeout(2200);
  }
  await page.waitForTimeout(800);
  await ctx.close(); // finalizes the video file
}

await browser.close();

// Normalize the recorded video filename.
const files = readdirSync(RECDIR).filter((f) => f.endsWith(".webm"));
if (files[0]) {
  renameSync(join(RECDIR, files[0]), join(RECDIR, "trading.webm"));
  console.log("recording: public/rec/trading.webm");
} else {
  console.log("WARNING: no recording produced");
}
console.log("capture done");
