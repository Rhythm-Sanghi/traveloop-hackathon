import { test, expect } from '@playwright/test';
import axePlaywright from 'axe-playwright';

const { injectAxe, getAxeResults } = axePlaywright;

test('login page has no serious automated accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await injectAxe(page);
  const results = await getAxeResults(page);
  const violations = results.violations;
  const serious = violations.filter((violation) =>
    ['critical', 'serious'].includes(violation.impact),
  );
  expect(serious).toEqual([]);
});

test('core viewport remains usable at mobile width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile project only');
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});
