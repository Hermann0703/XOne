import { test, expect } from '@playwright/test';

// ============================================================
// 深色模式切换 & 语言切换 (i18n) E2E 测试
//
// 说明：
// - 主题切换和语言切换器位于 Sidebar 中，Sidebar 仅存在于
//   [locale] 布局路由（如 /zh/personal/dashboard）。
// - /login 与 /register 没有 locale 前缀，也没有 Sidebar，
//   因此语言切换测试从 locale-prefixed 路由开始。
// - Theme store: data-theme="light|dark" 挂载于 <html>
// - Mode store: data-mode="personal|work" 挂载于 <html>
//   测试验证 data-mode 不受主题切换影响。
// ============================================================

test.describe('深色模式切换', () => {

  test.beforeEach(async ({ page }) => {
    // 重置为浅色模式，确保初始状态一致
    await page.goto('/zh/personal/dashboard');
    await page.waitForLoadState('networkidle');

    // 如果当前是深色，先切回浅色
    const html = page.locator('html');
    const currentTheme = await html.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      const toggle = page.getByTitle('切换到浅色模式');
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('初始状态为浅色模式', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('点击主题切换按钮，切换至深色模式', async ({ page }) => {
    // 找到主题切换按钮（浅色模式时 title 为 "切换到深色模式"）
    const themeToggle = page.getByTitle('切换到深色模式');
    await expect(themeToggle).toBeVisible({ timeout: 5_000 });

    // 点击切换
    await themeToggle.click();
    await page.waitForTimeout(500); // 等待过渡动画

    // 验证 <html> 的 data-theme 变为 dark
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('再次点击主题切换按钮，可切回浅色模式', async ({ page }) => {
    // 先切到深色
    const toDark = page.getByTitle('切换到深色模式');
    await toDark.click();
    await page.waitForTimeout(500);

    // 验证深色
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 再切回浅色
    const toLight = page.getByTitle('切换到浅色模式');
    await expect(toLight).toBeVisible();
    await toLight.click();
    await page.waitForTimeout(500);

    // 验证浅色
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('data-mode 属性不受主题切换影响', async ({ page }) => {
    // 记录初始 data-mode
    const html = page.locator('html');
    const initialMode = await html.getAttribute('data-mode');

    // 切换到深色
    const themeToggle = page.getByTitle('切换到深色模式');
    await themeToggle.click();
    await page.waitForTimeout(500);

    // data-theme 变了，但 data-mode 应保持不变
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveAttribute('data-mode', initialMode ?? 'personal');

    // 切回浅色
    const toLight = page.getByTitle('切换到浅色模式');
    await toLight.click();
    await page.waitForTimeout(500);

    // data-mode 仍不变
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).toHaveAttribute('data-mode', initialMode ?? 'personal');
  });

  test('主题切换后，Moon/Sun 图标正确切换', async ({ page }) => {
    // 浅色模式 → Moon 图标可见（表示点击后进入深色）
    const themeToggle = page.getByTitle('切换到深色模式');
    await expect(themeToggle).toBeVisible();

    // 点击切换到深色
    await themeToggle.click();
    await page.waitForTimeout(500);

    // 深色模式 → Sun 图标可见（表示点击后进入浅色）
    const toLight = page.getByTitle('切换到浅色模式');
    await expect(toLight).toBeVisible();
  });
});

test.describe('语言切换 (i18n)', () => {

  test.beforeEach(async ({ page }) => {
    // 从中文 locale 路由开始（确保 LocaleSwitcher 在 Sidebar 中可用）
    await page.goto('/zh/personal/dashboard');
    await page.waitForLoadState('networkidle');

    // 如果当前不是中文，先切回中文
    const currentUrl = page.url();
    if (currentUrl.includes('/en/')) {
      const switcher = page.getByTitle('切换到 中文');
      if (await switcher.isVisible().catch(() => false)) {
        await switcher.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('初始语言为中文，URL 包含 /zh/ 前缀', async ({ page }) => {
    await expect(page).toHaveURL(/\/zh\//);
    // LocaleSwitcher 显示 "中文"
    await expect(page.getByText('中文')).toBeVisible();
  });

  test('切换到英文后 URL 与界面文字均更新', async ({ page }) => {
    // 点击语言切换按钮
    const localeSwitcher = page.getByTitle('切换到 English');
    await expect(localeSwitcher).toBeVisible({ timeout: 5_000 });
    await localeSwitcher.click();
    await page.waitForTimeout(500);

    // URL 变为 /en/
    await expect(page).toHaveURL(/\/en\//);

    // LocaleSwitcher 文字变为 "English"
    await expect(page.getByText('English')).toBeVisible();

    // 侧边栏中的标题应变为英文 — 检查页面不报 500
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('切换到英文后，导航至其他页面，locale 前缀保持不变', async ({ page }) => {
    // 切换到英文
    const localeSwitcher = page.getByTitle('切换到 English');
    await localeSwitcher.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/en\//);

    // 导航至资产页面
    await page.goto('/en/personal/assets');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/en\/personal\/assets/);
    await expect(page).not.toHaveTitle(/500|Error/);

    // LocaleSwitcher 仍显示 "English"
    await expect(page.getByText('English')).toBeVisible();
  });

  test('从英文切换回中文，URL 与文字均恢复', async ({ page }) => {
    // 先切换到英文
    const toEn = page.getByTitle('切换到 English');
    await toEn.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/en\//);

    // 再切换回中文
    const toZh = page.getByTitle('切换到 中文');
    await expect(toZh).toBeVisible();
    await toZh.click();
    await page.waitForTimeout(500);

    // URL 恢复 /zh/
    await expect(page).toHaveURL(/\/zh\//);

    // LocaleSwitcher 文字恢复 "中文"
    await expect(page.getByText('中文')).toBeVisible();
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('语言切换前后，页面不出现 500 错误', async ({ page }) => {
    // 切换英文
    const toEn = page.getByTitle('切换到 English');
    await toEn.click();
    await page.waitForTimeout(500);
    await expect(page).not.toHaveTitle(/500|Error/);
    await expect(page).toHaveURL(/\/en\//);

    // 切换回中文
    const toZh = page.getByTitle('切换到 中文');
    await toZh.click();
    await page.waitForTimeout(500);
    await expect(page).not.toHaveTitle(/500|Error/);
    await expect(page).toHaveURL(/\/zh\//);
  });
});

test.describe('深色模式 + i18n 组合', () => {

  test('英文 + 深色模式组合', async ({ page }) => {
    // 从中文浅色模式开始
    await page.goto('/zh/personal/dashboard');
    await page.waitForLoadState('networkidle');

    // 1. 切换语言至英文
    const toEn = page.getByTitle('切换到 English');
    await expect(toEn).toBeVisible({ timeout: 5_000 });
    await toEn.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/en\//);

    // 2. 切换主题至深色
    const toDark = page.getByTitle('切换到深色模式');
    await expect(toDark).toBeVisible();
    await toDark.click();
    await page.waitForTimeout(500);

    // 3. 访问资产页面，验证组合状态
    await page.goto('/en/personal/assets');
    await page.waitForLoadState('networkidle');

    // 验证：英文 locale + 深色主题
    await expect(page).toHaveURL(/\/en\/personal\/assets/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'personal');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('切换回中文 + 浅色模式', async ({ page }) => {
    // 建立初始组合：英文 + 深色
    await page.goto('/zh/personal/dashboard');
    await page.waitForLoadState('networkidle');

    const toEn = page.getByTitle('切换到 English');
    await toEn.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/en\//);

    const toDark = page.getByTitle('切换到深色模式');
    await toDark.click();
    await page.waitForTimeout(500);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 切回中文 + 浅色
    const toZh = page.getByTitle('切换到 中文');
    await toZh.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/zh\//);

    const toLight = page.getByTitle('切换到浅色模式');
    await toLight.click();
    await page.waitForTimeout(500);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // 验证组合恢复
    await expect(page).toHaveURL(/\/zh\//);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'personal');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('先切换主题再切换语言，组合状态正确', async ({ page }) => {
    // 从中文浅色开始
    await page.goto('/zh/personal/dashboard');
    await page.waitForLoadState('networkidle');

    // 先切深色
    const toDark = page.getByTitle('切换到深色模式');
    await toDark.click();
    await page.waitForTimeout(500);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 再切英文 — 主题应保持 dark
    const toEn = page.getByTitle('切换到 English');
    await toEn.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/en\//);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('切换模式后 data-mode 变化，主题和语言不受影响', async ({ page }) => {
    // 从中文浅色个人模式开始
    await page.goto('/zh/personal/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'personal');

    // 切换到工作模式（如果 ModeSwitch 可访问）
    // ModeSwitch 点击后会导航到 /work/dashboard
    const modeSwitch = page.getByText('工作模式');
    if (await modeSwitch.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await modeSwitch.click();
      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle');

      // 验证 data-mode 已切换为 work
      await expect(page.locator('html')).toHaveAttribute('data-mode', 'work');

      // 主题和语言应保持不变
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await expect(page).toHaveURL(/\/zh\//);
    }

    await expect(page).not.toHaveTitle(/500|Error/);
  });
});
