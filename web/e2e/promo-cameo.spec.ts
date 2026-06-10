import { test, expect } from "@playwright/test";
import { pickSolo, seedSoloPlayer, tradeBurst } from "./helpers";

test.describe("Promo cameo recording", () => {
  test("solo gameplay highlight reel", async ({ page }) => {
    test.setTimeout(120_000);
    await seedSoloPlayer(page);
    await page.goto("/");
    await expect(page.getByText("Single player")).toBeVisible();
    await page.waitForTimeout(1500);
    await page.getByTestId("mode-solo").click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    await tradeBurst(page);
    await page.waitForTimeout(2500);
    await page.keyboard.press(" ");
    await page.waitForTimeout(800);
    await page.keyboard.press(" ");
    await page.waitForTimeout(1500);
    await page.keyboard.press("b");
    await page.waitForTimeout(1200);
    await page.keyboard.press("e");
    await page.waitForTimeout(1500);
    await page.keyboard.press("c");
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: /tradr/i }).click();
    await expect(page.getByText("Community")).toBeVisible();
    await page.getByText("Community").click();
    await page.waitForTimeout(2500);
  });
});
