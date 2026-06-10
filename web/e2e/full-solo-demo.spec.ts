import { test, expect } from "@playwright/test";
import { exploreMenuTabs, randomPlayUntilGameOver, seedFullSoloDemo } from "./helpers";

test.describe("Full solo journey (one long video)", () => {
  test("mode select through 3min round and post-game", async ({ page, isMobile }) => {
    test.setTimeout(600_000);
    await seedFullSoloDemo(page);
    await page.goto("/");
    await expect(page.getByTestId("mode-solo")).toBeVisible();
    await page.waitForTimeout(2500);
    await page.getByTestId("mode-solo").click();
    if (isMobile) await page.getByTestId("trade-long").waitFor({ timeout: 30_000 });
    else await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    await randomPlayUntilGameOver(page, 195_000, isMobile);
    await page.waitForTimeout(2500);
    await page.getByTestId("game-over-review").click();
    await page.waitForTimeout(3000);
    await page.getByTestId("review-save").click();
    await page.waitForTimeout(2000);
    await page.getByTestId("review-close").click();
    await page.waitForTimeout(1500);
    await page.getByTestId("game-over-menu").click();
    await exploreMenuTabs(page, "FULL");
    await page.getByTestId("menu-close").click();
    await page.waitForTimeout(1500);
    await page.getByTestId("game-over-continue").click();
    await expect(page.getByTestId("landing-play-again")).toBeVisible();
    await page.waitForTimeout(3000);
    await page.getByTestId("landing-tutorial").click();
    await expect(page.getByText("How to play Tradr")).toBeVisible();
    await page.waitForTimeout(2500);
    await page.getByTestId("tutorial-start").click();
    await expect(page.getByTestId("landing-play-again")).toBeVisible();
    await page.waitForTimeout(2500);
  });
});
