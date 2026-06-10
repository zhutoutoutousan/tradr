import { expect, type Page } from "@playwright/test";

export async function seedSoloPlayer(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("tradr.tutorial.v1", "1");
    localStorage.setItem("tradr.device.v1", "e2e-00000000-0000-0000-0000-000000000001");
  });
}

export async function pickSolo(page: Page) {
  await page.goto("/");
  await page.getByTestId("mode-solo").click();
  await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
}

export async function tradeBurst(page: Page) {
  await page.keyboard.press("b");
  await page.waitForTimeout(400);
  await page.keyboard.press("4");
  await page.waitForTimeout(600);
  await page.keyboard.press("q");
  await page.waitForTimeout(400);
  await page.keyboard.press("w");
  await page.waitForTimeout(400);
  await page.keyboard.press("s");
  await page.waitForTimeout(400);
  await page.keyboard.press("c");
}

export async function seedDemoPlayer(page: Page, roundMs: number) {
  await page.addInitScript((ms: number) => {
    localStorage.setItem("tradr.tutorial.v1", "1");
    localStorage.setItem("tradr.device.v1", "demo-00000000-0000-0000-0000-000000000099");
    localStorage.setItem("tradr.demo.roundMs", String(ms));
  }, roundMs);
}

export async function shot(page: Page, name: string) {
  await page.screenshot({ path: `demo-output/screenshots/${name}.png`, fullPage: false });
}

export async function randomPlayUntilGameOver(page: Page, maxWaitMs = 210_000, touch = false) {
  if (touch) {
    const fast = page.getByRole("button", { name: /^20x$/i });
    if (await fast.isVisible().catch(() => false)) await fast.click();
    else await page.keyboard.press("4");
  } else {
    await page.keyboard.press("4");
  }
  const keys = ["b", "s", "c", "q", "w", "e", "r", "t"] as const;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await page.getByTestId("game-over-modal").isVisible().catch(() => false)) break;
    if (touch) {
      const pick = Math.floor(Math.random() * 3);
      if (pick === 0) await page.getByTestId("trade-long").click();
      else if (pick === 1) await page.getByTestId("trade-short").click();
      else await page.getByTestId("trade-close").click();
      if (Math.random() > 0.55) await page.keyboard.press(keys[3 + Math.floor(Math.random() * 5)]!);
    } else {
      await page.keyboard.press(keys[Math.floor(Math.random() * keys.length)]!);
    }
    await page.waitForTimeout(600 + Math.floor(Math.random() * 1400));
  }
  await page.getByTestId("game-over-modal").waitFor({ timeout: 30_000 });
}

export async function exploreAfterRound(page: Page) {
  await shot(page, "06-game-over");
  await page.getByTestId("game-over-review").click();
  await page.waitForTimeout(2000);
  await shot(page, "07-review-chart");
  await page.getByTestId("review-close").click();
  await page.getByTestId("game-over-continue").click();
  await expect(page.getByText("Play again")).toBeVisible();
  await shot(page, "08-landing-intro");
  await page.getByRole("button", { name: /change mode/i }).click();
  await shot(page, "09-mode-select-return");
  await page.getByTestId("mode-solo").click();
  await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /tradr/i }).click();
  await page.getByText("Community").click();
  await page.waitForTimeout(1500);
  await shot(page, "10-menu-community");
  await page.getByTestId("menu-close").click();
}

export async function flowShot(page: Page, name: string) {
  await page.screenshot({ path: `demo-output/flows/${name}.png`, fullPage: false });
}

export async function seedFlowPlayer(page: Page, roundMs = 12_000) {
  await page.addInitScript((ms: number) => {
    localStorage.setItem("tradr.tutorial.v1", "1");
    localStorage.setItem("tradr.device.v1", "flow-00000000-0000-0000-0000-000000000042");
    localStorage.setItem("tradr.demo.roundMs", String(ms));
    localStorage.setItem(
      "tradr.profile.v1",
      JSON.stringify({ elo: 1285, bestElo: 1310, roundsPlayed: 12, firstPlaces: 2, bestReturnPct: 8.4, bestRoundProfit: 420, unlocked: ["first-round", "first-win"] }),
    );
  }, roundMs);
}

export async function seedFullSoloDemo(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("tradr.tutorial.v1", "1");
    localStorage.setItem("tradr.device.v1", "full-00000000-0000-0000-0000-000000000099");
    localStorage.setItem("tradr.demo.roundMs", "180000");
    localStorage.setItem("tradr.demo.noBust", "1");
    localStorage.setItem(
      "tradr.profile.v1",
      JSON.stringify({ elo: 1285, bestElo: 1310, roundsPlayed: 12, firstPlaces: 2, bestReturnPct: 8.4, bestRoundProfit: 420, unlocked: ["first-round", "first-win"] }),
    );
  });
}

export async function waitForGameOver(page: Page, maxMs = 20_000) {
  await page.keyboard.press("4");
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await page.getByTestId("game-over-modal").isVisible().catch(() => false)) return;
    await page.keyboard.press(["b", "s", "c"][Math.floor(Math.random() * 3)]!);
    await page.waitForTimeout(400);
  }
  await page.getByTestId("game-over-modal").waitFor({ timeout: 15_000 });
}

export async function exploreMenuTabs(page: Page, prefix: string) {
  const tabs = [
    ["menu-tab-play", "how-to-play"],
    ["menu-tab-community", "community"],
    ["menu-tab-achievements", "achievements"],
    ["menu-tab-history", "history"],
    ["menu-tab-pro", "pro"],
  ] as const;
  for (const [id, slug] of tabs) {
    await page.getByTestId(id).click();
    await page.waitForTimeout(800);
    await flowShot(page, `${prefix}-menu-${slug}`);
  }
}
