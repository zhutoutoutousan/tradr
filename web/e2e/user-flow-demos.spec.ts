import { test, expect } from "@playwright/test";
import { flowShot, seedFlowPlayer, tradeBurst, waitForGameOver, exploreMenuTabs } from "./helpers";

test.describe("Solo user flow demos (no multiplayer)", () => {
  test.beforeEach(async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir("demo-output/flows", { recursive: true });
  });

  test("UF-01 mode select", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("mode-solo")).toBeVisible();
    await flowShot(page, "UF-01-mode-select");
    await page.waitForTimeout(800);
  });

  test("UF-02 first-time tutorial", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("tradr.tutorial.v1"));
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await expect(page.getByText("How to play Tradr")).toBeVisible();
    await flowShot(page, "UF-02-tutorial");
    await page.getByTestId("tutorial-start").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await flowShot(page, "UF-03-after-tutorial");
  });

  test("UF-04 in-game trading and menu", async ({ page }) => {
    test.setTimeout(60_000);
    await seedFlowPlayer(page, 120_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await flowShot(page, "UF-04-game-loaded");
    await tradeBurst(page);
    await flowShot(page, "UF-05-trading-powerups");
    await page.getByRole("button", { name: /tradr/i }).click();
    await exploreMenuTabs(page, "UF-06");
    await page.getByTestId("menu-close").click();
  });

  test("UF-07 game over modal", async ({ page }) => {
    test.setTimeout(90_000);
    await seedFlowPlayer(page, 10_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await waitForGameOver(page, 15_000);
    await flowShot(page, "UF-07-game-over");
  });

  test("UF-08 review modal and save gate", async ({ page }) => {
    test.setTimeout(90_000);
    await seedFlowPlayer(page, 10_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await waitForGameOver(page, 15_000);
    await page.getByTestId("game-over-review").click();
    await page.waitForTimeout(1500);
    await flowShot(page, "UF-08-review-chart");
    await page.getByTestId("review-save").click();
    await page.waitForTimeout(500);
    await flowShot(page, "UF-09-review-register-gate");
    await page.getByTestId("review-close").click();
  });

  test("UF-10 game over menu tabs", async ({ page }) => {
    test.setTimeout(90_000);
    await seedFlowPlayer(page, 10_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await waitForGameOver(page, 15_000);
    await page.getByTestId("game-over-menu").click();
    await exploreMenuTabs(page, "UF-10");
    await page.getByTestId("menu-close").click();
  });

  test("UF-11 continue to landing intro", async ({ page }) => {
    test.setTimeout(90_000);
    await seedFlowPlayer(page, 10_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await waitForGameOver(page, 15_000);
    await page.getByTestId("game-over-continue").click();
    await expect(page.getByTestId("landing-play-again")).toBeVisible();
    await flowShot(page, "UF-11-landing-intro");
  });

  test("UF-12 landing tutorial reopen", async ({ page }) => {
    test.setTimeout(90_000);
    await seedFlowPlayer(page, 10_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await waitForGameOver(page, 15_000);
    await page.getByTestId("game-over-continue").click();
    await page.getByTestId("landing-tutorial").click();
    await flowShot(page, "UF-12-landing-tutorial-modal");
    await page.getByTestId("tutorial-start").click();
    await flowShot(page, "UF-13-landing-after-tutorial");
  });

  test("UF-14 landing play again", async ({ page }) => {
    test.setTimeout(120_000);
    await seedFlowPlayer(page, 10_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await waitForGameOver(page, 15_000);
    await page.getByTestId("game-over-continue").click();
    await page.getByTestId("landing-play-again").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await flowShot(page, "UF-14-play-again-new-round");
  });

  test("UF-15 landing change mode", async ({ page }) => {
    test.setTimeout(90_000);
    await seedFlowPlayer(page, 10_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await waitForGameOver(page, 15_000);
    await page.getByTestId("game-over-continue").click();
    await page.getByTestId("landing-change-mode").click();
    await expect(page.getByTestId("mode-solo")).toBeVisible();
    await flowShot(page, "UF-15-change-mode");
  });

  test("UF-16 game over play again", async ({ page }) => {
    test.setTimeout(120_000);
    await seedFlowPlayer(page, 10_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await waitForGameOver(page, 15_000);
    await page.getByTestId("game-over-replay").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await flowShot(page, "UF-16-game-over-replay");
  });

  test("UF-17 full post-game journey (video)", async ({ page }) => {
    test.setTimeout(180_000);
    await seedFlowPlayer(page, 12_000);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByRole("button", { name: /long/i }).first().waitFor({ timeout: 30_000 });
    await page.keyboard.press("b");
    await waitForGameOver(page, 18_000);
    await flowShot(page, "UF-17a-game-over");
    await page.getByTestId("game-over-review").click();
    await page.waitForTimeout(1500);
    await flowShot(page, "UF-17b-review");
    await page.getByTestId("review-close").click();
    await page.getByTestId("game-over-menu").click();
    await page.getByTestId("menu-tab-community").click();
    await page.waitForTimeout(1000);
    await flowShot(page, "UF-17c-menu-community");
    await page.getByTestId("menu-close").click();
    await page.getByTestId("game-over-continue").click();
    await flowShot(page, "UF-17d-landing");
    await page.getByTestId("landing-change-mode").click();
    await flowShot(page, "UF-17e-mode-select");
  });
});
