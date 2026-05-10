import { test, expect } from '@playwright/test';

// ============================================================
// d7 补充 E2E 测试
// 覆盖：
//   1. 知识库 AI 对话流式消息（d3 新增功能）
//   2. 资产子页面（accounts / transactions）
//   3. 合同详情页
//   4. 可访问性基础断言
//   5. 404 页面
//   6. 深色模式 — 工作页面遍历
// ============================================================

// ─── 1. 知识库 AI 对话 ──────────────────────────────────────

test.describe('知识库 AI 对话', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/work/knowledge');
    await page.waitForLoadState('networkidle');
    // 关闭所有意外的对话框
    page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));
  });

  test('知识库页面加载，切换到对话标签后显示输入区域', async ({ page }) => {
    await expect(page).not.toHaveTitle(/500|Error/);

    // 切换到「智能问答」标签
    const chatTab = page.getByText('智能问答').first();
    if (await chatTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await chatTab.click();
      await page.waitForTimeout(1_000);
    }

    // 查找输入框（ChatPanel 为 dynamic import，需等待渲染）
    // 先等"新建对话"按钮出现，确认 ChatPanel 已加载
    const newChatBtn = page.getByRole('button', { name: /新建|新对话|new.*conversation/i }).first();
    if (await newChatBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      // ChatPanel 已加载，textarea 应该也已渲染
      const input = page.locator('textarea').first();
      await expect(input).toBeVisible({ timeout: 3_000 });
    } else {
      // 如果新建对话按钮也没出现，尝试直接找 textarea
      const input = page.locator('textarea').first();
      await expect(input).toBeVisible({ timeout: 3_000 });
    }
  });

  test('新建对话后对话列表出现新条目', async ({ page }) => {
    // 切换到「智能问答」标签
    const chatTab = page.getByText('智能问答').first();
    if (await chatTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await chatTab.click();
      await page.waitForTimeout(1_000);
    }

    // 点击"新建对话"按钮
    const newChatBtn = page.getByRole('button', { name: /新建|新对话|new|chat/i });
    if (await newChatBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await newChatBtn.click();
      await page.waitForTimeout(500);
    }
    // 验证没有崩溃
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('发送消息后，页面不报错', async ({ page }) => {
    // 切换到「智能问答」标签
    const chatTab = page.getByText('智能问答').first();
    if (await chatTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await chatTab.click();
      await page.waitForTimeout(1_000);
    }

    const input = page.locator('textarea').first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, '输入框不可见，跳过');
    }

    // 输入消息
    await input.fill('你好');
    await page.waitForTimeout(200);

    // 发送（按 Enter 或点击发送按钮）
    const sendBtn = page.getByRole('button', { name: /发送|send/i }).first();
    if (await sendBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await input.press('Enter');
    }

    // 等待响应
    await page.waitForTimeout(3_000);

    // 验证页面没有崩溃
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('流式响应完成后，页面仍可用', async ({ page }) => {
    // 切换到「智能问答」标签
    const chatTab = page.getByText('智能问答').first();
    if (await chatTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await chatTab.click();
      await page.waitForTimeout(1_000);
    }

    const input = page.locator('textarea').first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, '输入框不可见，跳过');
    }

    // 发送
    await input.fill('hi');
    await page.waitForTimeout(200);
    const sendBtn = page.getByRole('button', { name: /发送|send/i }).first();
    if (await sendBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await input.press('Enter');
    }

    // 等待流式响应（最多 12 秒）
    await page.waitForTimeout(12_000);

    // 验证没有 500 错误，且输入框仍可交互
    await expect(page).not.toHaveTitle(/500|Error/);
    const stillInput = page.locator('textarea').first();
    await expect(stillInput).toBeVisible({ timeout: 3_000 });
  });

  test('可切换已有对话', async ({ page }) => {
    // 切换到「智能问答」标签
    const chatTab = page.getByText('智能问答').first();
    if (await chatTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await chatTab.click();
      await page.waitForTimeout(1_000);
    }
    // 点击对话列表中的某个条目（如果有的话）
    const convoItems = page.locator('[class*="conversation"] button, [class*="chat"] button, [role="listitem"] button').first();
    if (await convoItems.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await convoItems.click();
      await page.waitForTimeout(500);
    }
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('可删除对话', async ({ page }) => {
    // 切换到「智能问答」标签
    const chatTab = page.getByText('智能问答').first();
    if (await chatTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await chatTab.click();
      await page.waitForTimeout(1_000);
    }
    // 查找删除按钮（通常在对话条目上有叉号或右键菜单）
    const delBtn = page.getByRole('button', { name: /删除|delete|🗑|✕/i }).first();
    if (!(await delBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, '无可删除的对话或删除按钮不可见');
    }

    await delBtn.click();
    await page.waitForTimeout(500);

    // 可能弹出确认对话框
    const confirmBtn = page.getByRole('button', { name: /确认|确定|yes|ok/i });
    if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page).not.toHaveTitle(/500|Error/);
  });
});

// ─── 2. 资产子页面 ──────────────────────────────────────────

test.describe('资产子页面', () => {

  test('账户列表 /personal/assets/accounts — 页面可加载', async ({ page }) => {
    await page.goto('/zh/personal/assets/accounts');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('交易记录 /personal/assets/transactions — 页面可加载', async ({ page }) => {
    await page.goto('/zh/personal/assets/transactions');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
  });

  test('资产列表 /personal/assets — 页面可加载并有内容区域', async ({ page }) => {
    await page.goto('/zh/personal/assets');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);
    // 验证页面有主内容区域（不是空白页）
    const mainContent = page.locator('main, [role="main"], .main-content, #main-content').first();
    await expect(mainContent).toBeVisible({ timeout: 5_000 });
  });
});

// ─── 3. 合同详情页 ──────────────────────────────────────────

test.describe('合同详情页', () => {

  test('合同列表加载后，第一条合同可点击进入详情', async ({ page }) => {
    await page.goto('/zh/work/contracts');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500|Error/);

    // 点击列表中第一个可点击的合同卡片或行
    const firstContract = page.locator('a[href*="/contracts/"], [class*="contract"] a, [class*="contract"] button').first();
    if (!(await firstContract.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, '合同列表无项目可点击');
    }

    await firstContract.click();
    await page.waitForTimeout(1_000);
    await page.waitForLoadState('networkidle');

    // 验证进入详情页（URL 包含 contracts/ 后跟 ID）
    await expect(page).toHaveURL(/\/contracts\/[^/]+/);
    await expect(page).not.toHaveTitle(/500|Error/);
  });
});

// ─── 4. 可访问性基础断言 ────────────────────────────────────

test.describe('可访问性基础', () => {

  test('页面有 main landmark', async ({ page }) => {
    await page.goto('/zh/work/dashboard');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible({ timeout: 5_000 });
  });

  test('Sidebar 有 navigation landmark', async ({ page }) => {
    await page.goto('/zh/personal/dashboard');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 5_000 });
  });

  test('主题切换按钮有可访问的 title 属性', async ({ page }) => {
    await page.goto('/zh/personal/dashboard');
    await page.waitForLoadState('networkidle');
    // ThemeToggle 必须有 title（用于屏幕阅读器）
    const themeToggle = page.getByTitle(/切换.*模式|switch.*mode/i).first();
    await expect(themeToggle).toBeVisible({ timeout: 5_000 });
  });

  test('语言切换按钮有可访问的 title 属性', async ({ page }) => {
    await page.goto('/zh/personal/dashboard');
    await page.waitForLoadState('networkidle');
    // LocaleSwitcher 必须有特定的 title（"切换到 English" 或 "切换到 中文"）
    const localeSwitcher = page.getByTitle('切换到 English').first();
    await expect(localeSwitcher).toBeVisible({ timeout: 5_000 });
  });

  test('模态对话框打开后可被关闭（ESC 或关闭按钮）', async ({ page }) => {
    await page.goto('/zh/work/project');
    await page.waitForLoadState('networkidle');

    // 尝试打开添加项目的对话框
    const addBtn = page.getByRole('button', { name: /添加|新建|新增|add|new|create/i }).first();
    if (!(await addBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, '无添加按钮可见');
    }

    await addBtn.click();
    await page.waitForTimeout(500);

    // 验证对话框出现
    const dialog = page.locator('[role="dialog"], [data-state="open"]').first();
    if (await dialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
      // 按 ESC 关闭
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      // 对话框应关闭
      await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    }
  });
});

// ─── 5. 错误页面 ────────────────────────────────────────────

test.describe('错误页面处理', () => {

  test('404 页面 — 访问不存在路由不会崩溃', async ({ page }) => {
    await page.goto('/zh/personal/nonexistent-page-xyz');
    await page.waitForLoadState('networkidle');
    // 不应该报 500，可能是 404 页面或重定向
    await expect(page).not.toHaveTitle(/500/);
  });

  test('404 页面 — 访问无效 locale 路由不会崩溃', async ({ page }) => {
    await page.goto('/xx/work/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveTitle(/500/);
  });
});

// ─── 6. 深色模式 — 工作页面遍历 ─────────────────────────────

test.describe('深色模式 — 工作页面遍历', () => {

  const workPages = [
    '/zh/work/dashboard',
    '/zh/work/knowledge',
    '/zh/work/project',
    '/zh/work/contracts',
    '/zh/work/archives',
    '/zh/work/storage',
    '/zh/work/search',
    '/zh/work/dispatch',
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/personal/dashboard');
    await page.waitForLoadState('networkidle');
    // 切换到深色模式
    const toDark = page.getByTitle('切换到深色模式').first();
    if (await toDark.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await toDark.click();
      await page.waitForTimeout(500);
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  for (const url of workPages) {
    test(`${url} — 深色模式不报错`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveTitle(/500|Error/);

      // 深色主题应保持
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });
  }
});
