import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
import { mkdir } from "node:fs/promises";

const e2eDir = join(root, "e2e");
await mkdir(e2eDir, { recursive: true });

const files = {
  "helpers.ts": `import { expect, type Page } from "@playwright/test";

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
  await page.screenshot({ path: \`demo-output/screenshots/\${name}.png\`, fullPage: false });
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
  await page.screenshot({ path: \`demo-output/flows/\${name}.png\`, fullPage: false });
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
    await flowShot(page, \`\${prefix}-menu-\${slug}\`);
  }
}
`,
  "user-flow.spec.ts": `import { test, expect } from "@playwright/test";
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
`,
  "sharp-demo.spec.ts": `import { test, expect } from "@playwright/test";
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
`,
  "promo-cameo.spec.ts": `import { test, expect } from "@playwright/test";
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
`,
};

const userFlowDemos = `import { test, expect } from "@playwright/test";
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
`;

const fullSoloDemo = `import { test, expect } from "@playwright/test";
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
`;

const config = `import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: ["**/promo-cameo.spec.ts", "**/sharp-demo.spec.ts", "**/user-flow-demos.spec.ts", "**/full-solo-demo.spec.ts"] },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: ["**/promo-cameo.spec.ts", "**/sharp-demo.spec.ts", "**/user-flow-demos.spec.ts", "**/full-solo-demo.spec.ts"] },
    {
      name: "flow-desktop",
      testMatch: "user-flow-demos.spec.ts",
      timeout: 180_000,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        video: { mode: "on", size: { width: 1920, height: 1080 } },
        launchOptions: { slowMo: 40 },
      },
    },
    {
      name: "flow-desktop-menu",
      testMatch: "user-flow-demos.spec.ts",
      grep: /UF-10|UF-17/,
      timeout: 180_000,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        video: { mode: "on", size: { width: 1920, height: 1080 } },
        launchOptions: { slowMo: 40 },
      },
    },
    {
      name: "sharp-desktop",
      testMatch: "sharp-demo.spec.ts",
      grepInvert: /mobile clip/,
      timeout: 420_000,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        video: { mode: "on", size: { width: 1920, height: 1080 } },
        launchOptions: { slowMo: 50 },
      },
    },
    {
      name: "sharp-mobile",
      testMatch: "sharp-demo.spec.ts",
      grep: /mobile clip/,
      timeout: 90_000,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1080, height: 1920 },
        isMobile: true,
        hasTouch: true,
        userAgent: devices["Pixel 7"].userAgent,
        video: { mode: "on", size: { width: 1080, height: 1920 } },
        launchOptions: { slowMo: 80 },
      },
    },
    {
      name: "full-solo-desktop",
      testMatch: "full-solo-demo.spec.ts",
      timeout: 600_000,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        video: { mode: "on", size: { width: 1920, height: 1080 } },
        launchOptions: { slowMo: 40 },
      },
    },
    {
      name: "full-solo-mobile",
      testMatch: "full-solo-demo.spec.ts",
      timeout: 600_000,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1080, height: 1920 },
        isMobile: true,
        hasTouch: true,
        userAgent: devices["Pixel 7"].userAgent,
        video: { mode: "on", size: { width: 1080, height: 1920 } },
        launchOptions: { slowMo: 40 },
      },
    },
    {
      name: "promo-desktop",
      testMatch: "promo-cameo.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        video: { mode: "on", size: { width: 1920, height: 1080 } },
        launchOptions: { slowMo: 80 },
      },
    },
    {
      name: "promo-mobile",
      testMatch: "promo-cameo.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1080, height: 1920 },
        isMobile: true,
        hasTouch: true,
        userAgent: devices["Pixel 7"].userAgent,
        video: { mode: "on", size: { width: 1080, height: 1920 } },
        launchOptions: { slowMo: 100 },
      },
    },
  ],
});
`;

for (const [name, content] of Object.entries(files)) {
  await writeFile(join(e2eDir, name), content, "utf8");
  console.log("wrote", join(e2eDir, name));
}
await writeFile(join(e2eDir, "user-flow-demos.spec.ts"), userFlowDemos, "utf8");
console.log("wrote", join(e2eDir, "user-flow-demos.spec.ts"));
await writeFile(join(e2eDir, "full-solo-demo.spec.ts"), fullSoloDemo, "utf8");
console.log("wrote", join(e2eDir, "full-solo-demo.spec.ts"));
await writeFile(join(root, "playwright.config.ts"), config, "utf8");
console.log("wrote playwright.config.ts");
