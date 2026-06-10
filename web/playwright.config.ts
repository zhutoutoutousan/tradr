import { defineConfig, devices } from "@playwright/test";

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
