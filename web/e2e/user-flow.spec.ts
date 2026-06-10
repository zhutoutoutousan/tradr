import { test, expect } from "@playwright/test";
import { pickSolo, seedSoloPlayer, tradeBurst } from "./helpers";

test.describe("Tradr user flow", () => {
  test("mode select -> solo game loads", async ({ page }) => {
    await seedSoloPlayer(page);
    await page.goto("/");
    await expect(page.getByText("Single player")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Multiplayer" })).toBeVisible();
    await pickSolo(page);
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByRole("button", { name: /long/i }).first()).toBeVisible();
  });

  test("first-time tutorial appears then starts game", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("tradr.tutorial.v1"));
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await expect(page.getByText("How to play Tradr")).toBeVisible();
    await page.getByTestId("tutorial-start").click();
    await expect(page.getByRole("button", { name: /long/i }).first()).toBeVisible({ timeout: 30_000 });
  });

  test("keyboard trading and menu open", async ({ page }) => {
    await seedSoloPlayer(page);
    await pickSolo(page);
    await tradeBurst(page);
    await page.getByRole("button", { name: /tradr/i }).click();
    await expect(page.getByText("How to play")).toBeVisible();
    await expect(page.getByText("Community")).toBeVisible();
  });

  test("multiplayer join screen", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("mode-multiplayer").click();
    await expect(page.getByRole("heading", { name: "Multiplayer" })).toBeVisible();
    await expect(page.getByRole("button", { name: /create & play/i })).toBeVisible();
  });

  test("mobile solo layout", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile project only");
    await seedSoloPlayer(page);
    await pickSolo(page);
    await expect(page.getByRole("button", { name: /^long$/i })).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
  });
});
