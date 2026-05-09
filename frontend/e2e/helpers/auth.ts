import { test as base, expect } from '@playwright/test';

/**
 * Auth fixture — logs in with test credentials before each test.
 * Credentials loaded from env vars (non-CI) or in-memory defaults (CI).
 */
const TEST_USER = {
  email: process.env.E2E_USER_EMAIL || 'test@xone.local',
  password: process.env.E2E_USER_PASSWORD || 'test123456',
};

export type AuthFixtures = {
  authenticatedPage: void;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: [
    async ({ page }, use) => {
      // Navigate to login page
      await page.goto('/login');
      // Fill credentials
      await page.getByLabel(/用户名|邮箱|email/i).fill(TEST_USER.email);
      await page.getByLabel(/密码|password/i).fill(TEST_USER.password);
      await page.getByRole('button', { name: /登录|sign in/i }).click();
      // Wait for redirect to dashboard
      await page.waitForURL(/\/dashboard|\/personal/, { timeout: 10_000 });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
