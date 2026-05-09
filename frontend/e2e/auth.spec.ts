import { test, expect } from '@playwright/test';

// ============================================================
// 认证相关页面渲染测试（无需登录）
// 测试登录页和注册页能否正常加载，不报 500 错误
// ============================================================

test.describe('登录 & 注册页面', () => {

  test('登录页 /login — 页面渲染正常，存在用户名和密码输入框', async ({ page }) => {
    // 导航到登录页
    await page.goto('/login');
    // 等待网络空闲，确保页面完全加载
    await page.waitForLoadState('networkidle');

    // 页面标题不应包含 500 或 Error 字样
    await expect(page).not.toHaveTitle(/500|Error/);

    // 验证表单核心字段存在：用户名输入框
    const usernameInput = page.getByLabel(/用户名|邮箱|email/i);
    await expect(usernameInput.first()).toBeVisible({ timeout: 5_000 });

    // 验证密码输入框存在
    const passwordInput = page.getByLabel(/密码|password/i);
    await expect(passwordInput.first()).toBeVisible({ timeout: 5_000 });

    // 验证登录/提交按钮存在
    const submitButton = page.getByRole('button', { name: /登录|sign in/i });
    await expect(submitButton.first()).toBeVisible({ timeout: 5_000 });
  });

  test('注册页 /register — 页面渲染正常，存在注册表单字段', async ({ page }) => {
    // 导航到注册页
    await page.goto('/register');
    // 等待网络空闲
    await page.waitForLoadState('networkidle');

    // 页面标题不应包含 500 或 Error 字样
    await expect(page).not.toHaveTitle(/500|Error/);

    // 注册页应有邮箱输入框
    const emailInput = page.getByLabel(/邮箱|email/i);
    await expect(emailInput.first()).toBeVisible({ timeout: 5_000 });

    // 注册页应有密码输入框
    const passwordInput = page.getByLabel(/密码|password/i);
    await expect(passwordInput.first()).toBeVisible({ timeout: 5_000 });

    // 验证注册/提交按钮存在
    const submitButton = page.getByRole('button', { name: /注册|sign up|create account/i });
    await expect(submitButton.first()).toBeVisible({ timeout: 5_000 });
  });

});
