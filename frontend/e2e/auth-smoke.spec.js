import { test, expect } from '@playwright/test';

test('application renders an authentication entry point', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('input').first()).toBeVisible();
});
