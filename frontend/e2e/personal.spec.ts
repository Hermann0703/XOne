import { test, expect } from '@playwright/test';

// ============================================================
// 个人模式页面渲染测试（无需登录）
// 直接导航各页面，验证页面能加载且无 500 错误。
// 若页面因未登录而重定向到 /login，也属可接受行为。
// ============================================================

test.describe('个人模式 — 页面渲染（未登录状态）', () => {

  test('个人面板 /personal/dashboard — 页面可加载', async ({ page }) => {
    await page.goto('/personal/dashboard');
    await page.waitForLoadState('networkidle');
    // 未登录时可能重定向到登录页，只要不报 500 即通过
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('健康 /personal/health — 页面可加载', async ({ page }) => {
    await page.goto('/personal/health');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('阅读 /personal/reading — 页面可加载', async ({ page }) => {
    await page.goto('/personal/reading');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('影视 /personal/media — 页面可加载', async ({ page }) => {
    await page.goto('/personal/media');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('购物 /personal/shopping — 页面可加载', async ({ page }) => {
    await page.goto('/personal/shopping');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('资产总览 /personal/assets — 页面可加载', async ({ page }) => {
    await page.goto('/personal/assets');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('资产账户 /personal/assets/accounts — 页面可加载', async ({ page }) => {
    await page.goto('/personal/assets/accounts');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('资产交易 /personal/assets/transactions — 页面可加载', async ({ page }) => {
    await page.goto('/personal/assets/transactions');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

});
