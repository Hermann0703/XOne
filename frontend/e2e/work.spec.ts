import { test, expect } from '@playwright/test';

// ============================================================
// 工作模式页面渲染测试（无需登录）
// 直接导航各页面，验证页面能加载且无 500 错误。
// 若页面因未登录而重定向到 /login，也属可接受行为。
// ============================================================

test.describe('工作模式 — 页面渲染（未登录状态）', () => {

  test('工作面板 /work/dashboard — 页面可加载', async ({ page }) => {
    await page.goto('/work/dashboard');
    await page.waitForLoadState('networkidle');
    // 未登录时可能重定向到登录页，只要不报 500 即通过
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('合同列表 /work/contracts — 页面可加载', async ({ page }) => {
    await page.goto('/work/contracts');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('知识库 /work/knowledge — 页面可加载', async ({ page }) => {
    await page.goto('/work/knowledge');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('调度 /work/dispatch — 页面可加载', async ({ page }) => {
    await page.goto('/work/dispatch');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('项目 /work/project — 页面可加载', async ({ page }) => {
    await page.goto('/work/project');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

});
