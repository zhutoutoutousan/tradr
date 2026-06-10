import { test, expect } from "@playwright/test";
import { exploreAfterRound, randomPlayUntilGameOver, seedDemoPlayer, shot } from "./helpers";

const FULL_ROUND_MS = 180_000;

test.describe("Sharp demo", () => {
  test("complete journey: random trades, 3min round, explore", async ({ page }) => {
    test.setTimeout(420_000);
    const { mkdir } = await import("node:fs/promises");
    await mkdir("demo-output/screenshots", { recursive: true });

    await seedDemoPlayer(page, FULL_ROUND_MS);
    await page.goto("/");
    await expect(page.getByTestId("mode-solo")).toBeVisible({ timeout: 15_000 });
    await shot(page, "01-mode-select");
    await page.waitForTimeout(1200);
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await shot(page, "02-game-loaded");
    await page.keyboard.press("4");

    const start = Date.now();
    const keys = ["b", "s", "c", "q", "w", "e", "r", "t"] as const;
    while (Date.now() - start < FULL_ROUND_MS + 15_000) {
      if (await page.getByTestId("game-over-modal").isVisible().catch(() => false)) break;
      await page.keyboard.press(keys[Math.floor(Math.random() * keys.length)]!);
      await page.waitForTimeout(700 + Math.floor(Math.random() * 1300));
      if (Date.now() - start > 45_000 && Date.now() - start < 46_000) await shot(page, "03-mid-round");
    }

    await page.getByTestId("game-over-modal").waitFor({ timeout: 45_000 });
    await exploreAfterRound(page);
    await page.waitForTimeout(1500);
  });
});

test.describe("Sharp demo mobile", () => {
  test("mobile clip", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile project only");
    test.setTimeout(90_000);
    const { mkdir } = await import("node:fs/promises");
    await mkdir("demo-output/screenshots", { recursive: true });
    await seedDemoPlayer(page, 25_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByTestId("trade-long").waitFor({ timeout: 30_000 });
    await shot(page, "11-mobile-game");
    await page.getByTestId("trade-long").click();
    await page.waitForTimeout(600);
    await page.getByTestId("trade-close").click();
    await page.waitForTimeout(600);
    await page.getByTestId("trade-short").click();
    await page.waitForTimeout(2000);
    await shot(page, "12-mobile-trading");
  });
});
