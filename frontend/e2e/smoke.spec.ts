import { test, expect } from '@playwright/test';

test.describe('Smoke: Core Application (no auth)', () => {

  test('homepage redirects to locale-prefixed home', async ({ page }) => {
    await page.goto('/');
    // next-intl middleware adds locale prefix (e.g., /zh or /en)
    await expect(page).toHaveURL(/\/(zh|en)(\/|$)/, { timeout: 5_000 });
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
    // Verify username input exists
    await expect(page.getByLabel(/用户名|邮箱|email/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });
});
