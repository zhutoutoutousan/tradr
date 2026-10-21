import { test, expect } from '@playwright/test';

test('QR Modal Demo - v2.1-qr-fix-v2', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  const versionBadge = page.locator('text=/v2\\.1-qr-fix-v2/i').first();
  await expect(versionBadge).toBeVisible({ timeout: 5000 });
  
  const multiplayerBtn = page.locator('button:has-text("Multiplayer")');
  await multiplayerBtn.click();
  await page.waitForTimeout(2000);
  
  const createBtn = page.locator('button:has-text("Create")').first();
  await createBtn.click();
  await page.waitForTimeout(4000);
  
  const shareBtn = page.locator('button:has-text("Share")').first();
  await shareBtn.click();
  await page.waitForTimeout(3000);
  
  const qrModal = page.locator('[class*="fixed"][class*="inset-0"]').first();
  await expect(qrModal).toBeVisible();
  
  await page.waitForTimeout(5000);
});
