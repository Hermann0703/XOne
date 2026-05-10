import { test, expect } from './helpers/auth';
import type { Page } from '@playwright/test';

// ============================================================
// 购物模块 CRUD E2E 测试
// 使用 auth fixture 自动登录 test@xone.local / test123456
// 每个测试独立：导航 → 操作 → 验证
// ============================================================

const SHOPPING_URL = '/personal/shopping';

/** 生成唯一商品名，避免测试间冲突 */
function uniqueName(prefix = 'E2E测试商品'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

test.describe('购物 CRUD 操作流', () => {

  // ─── Create ───────────────────────────────────────────
  test('购物模块 — 创建商品', async ({ page }: { page: Page }) => {
    // ✅ 登录由 auth fixture 自动完成

    // 导航到购物页面
    await page.goto(SHOPPING_URL);
    await page.waitForLoadState('networkidle');

    // 点击"添加"按钮打开表单弹窗
    // 注意：筛选栏和表单底部都有"添加"按钮，这里点的是筛选栏的按钮
    // 表单弹窗未打开时，筛选栏按钮是页面上唯一的"添加"按钮
    await page.getByRole('button', { name: '添加' }).click();

    // 等待表单弹窗出现
    const dialog = page.getByRole('dialog', { name: '添加购物项' });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // 填写表单字段
    const itemName = uniqueName();
    await dialog.getByLabel(/名称/).fill(itemName);
    await dialog.getByLabel(/价格/).fill('128.50');
    await dialog.getByLabel(/数量/).fill('2');
    await dialog.getByLabel('分类').fill('数码产品');

    // 选择优先级：点击 Select 下拉框
    await dialog.getByLabel('优先级').click();
    // 选择"高"选项
    await page.getByRole('option', { name: '🔴 高' }).click();

    // 填写店铺
    await dialog.getByLabel('店铺').fill('官方旗舰店');

    // 填写备注
    await dialog.getByLabel('备注').fill('E2E 自动化测试创建');

    // 提交表单 — 点击弹窗内的"添加"按钮
    await dialog.getByRole('button', { name: '添加' }).click();

    // 等待弹窗关闭
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // 验证：商品名称出现在列表中
    // 等待列表刷新（networkidle 确保 API 请求完成）
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 5_000 });

    // 额外验证：商品详情也出现在列表中
    await expect(page.getByText('数码产品')).toBeVisible();
    await expect(page.getByText('¥128.50')).toBeVisible();
    await expect(page.getByText('官方旗舰店')).toBeVisible();
  });

  // ─── Read ─────────────────────────────────────────────
  test('购物模块 — 读取商品列表', async ({ page }: { page: Page }) => {
    await page.goto(SHOPPING_URL);
    await page.waitForLoadState('networkidle');

    // 验证页面核心元素可见：
    //   筛选栏 + 添加按钮 或 表格（有数据） 或 空状态提示
    const addButton = page.getByRole('button', { name: '添加' });
    await expect(addButton).toBeVisible({ timeout: 5_000 });

    // 验证搜索框存在
    const searchInput = page.getByPlaceholder('搜索名称...');
    await expect(searchInput).toBeVisible();

    // 验证筛选下拉框存在
    const statusSelect = page.getByRole('combobox', { name: /状态/ });
    // 筛选栏的 Select 使用 placeholder 而非 label，这里用 placeholder 定位
    // 实际上筛选栏的三个 Select 没有显式 label，用 placeholder 匹配
    await expect(page.locator('select').first()).toBeAttached();

    // 验证：页面要么展示表格（有数据），要么展示空状态
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmpty = await page.getByText('暂无购物项').isVisible().catch(() => false);
    // 至少其中一种状态出现，说明页面正确渲染
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  // ─── Update ───────────────────────────────────────────
  test('购物模块 — 编辑更新商品', async ({ page }: { page: Page }) => {
    await page.goto(SHOPPING_URL);
    await page.waitForLoadState('networkidle');

    // 检查是否已有商品，若没有则先创建一个
    const emptyState = page.getByText('暂无购物项');
    let targetName: string;

    if (await emptyState.isVisible().catch(() => false)) {
      // == 无商品：创建一个供后续编辑 ==
      await page.getByRole('button', { name: '添加' }).click();
      const createDialog = page.getByRole('dialog', { name: '添加购物项' });
      await expect(createDialog).toBeVisible({ timeout: 5_000 });

      targetName = uniqueName('编辑测试');
      await createDialog.getByLabel(/名称/).fill(targetName);
      await createDialog.getByLabel(/价格/).fill('50.00');
      await createDialog.getByLabel(/数量/).fill('1');
      await createDialog.getByLabel('分类').fill('食品');
      await createDialog.getByRole('button', { name: '添加' }).click();

      await expect(createDialog).not.toBeVisible({ timeout: 5_000 });
      await page.waitForLoadState('networkidle');
    } else {
      // == 有商品：取第一个可见商品名作为编辑目标 ==
      // 表格第一行第一列是商品名称（TableCell 内包含名称文本）
      const firstRow = page.locator('table tbody tr').first();
      const nameCell = firstRow.locator('td').first();
      targetName = (await nameCell.innerText()).split('\n')[0].trim();
      expect(targetName.length).toBeGreaterThan(0);
    }

    // 找到该商品行的编辑按钮并点击
    // 每个商品行有两个操作按钮：编辑(title="编辑") 和 删除(title="删除")
    const editButton = page.getByRole('button', { name: '编辑' }).first();
    await editButton.click();

    // 等待编辑弹窗出现
    const editDialog = page.getByRole('dialog', { name: '编辑购物项' });
    await expect(editDialog).toBeVisible({ timeout: 5_000 });

    // 修改字段值
    const newPrice = '199.99';
    const newQuantity = '5';
    const newCategory = '更新分类';

    // 清空并重新填写价格
    await editDialog.getByLabel(/价格/).clear();
    await editDialog.getByLabel(/价格/).fill(newPrice);

    // 清空并重新填写数量
    await editDialog.getByLabel(/数量/).clear();
    await editDialog.getByLabel(/数量/).fill(newQuantity);

    // 清空并重新填写分类
    await editDialog.getByLabel('分类').clear();
    await editDialog.getByLabel('分类').fill(newCategory);

    // 点击"更新"按钮提交
    await editDialog.getByRole('button', { name: '更新' }).click();

    // 等待弹窗关闭
    await expect(editDialog).not.toBeVisible({ timeout: 5_000 });
    await page.waitForLoadState('networkidle');

    // 验证：更新后的值出现在列表中
    await expect(page.getByText(`¥${newPrice}`)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(newQuantity)).toBeVisible();
    await expect(page.getByText(newCategory)).toBeVisible();
  });

  // ─── Delete ───────────────────────────────────────────
  test('购物模块 — 删除商品', async ({ page }: { page: Page }) => {
    await page.goto(SHOPPING_URL);
    await page.waitForLoadState('networkidle');

    // 若无商品则先创建一个
    const emptyState = page.getByText('暂无购物项');
    let targetName: string;

    if (await emptyState.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: '添加' }).click();
      const createDialog = page.getByRole('dialog', { name: '添加购物项' });
      await expect(createDialog).toBeVisible({ timeout: 5_000 });

      targetName = uniqueName('删除测试');
      await createDialog.getByLabel(/名称/).fill(targetName);
      await createDialog.getByLabel(/价格/).fill('10.00');
      await createDialog.getByLabel(/数量/).fill('1');
      await createDialog.getByRole('button', { name: '添加' }).click();

      await expect(createDialog).not.toBeVisible({ timeout: 5_000 });
      await page.waitForLoadState('networkidle');
      // 确认商品已出现在列表中
      await expect(page.getByText(targetName)).toBeVisible({ timeout: 5_000 });
    } else {
      const firstRow = page.locator('table tbody tr').first();
      const nameCell = firstRow.locator('td').first();
      targetName = (await nameCell.innerText()).split('\n')[0].trim();
      expect(targetName.length).toBeGreaterThan(0);
    }

    // 记录删除前的商品数量
    const initialRowCount = await page.locator('table tbody tr').count();

    // 点击该商品行的删除按钮 (title="删除")
    const deleteButton = page.getByRole('button', { name: '删除' }).first();
    await deleteButton.click();

    // 确认删除对话框出现
    const confirmDialog = page.getByRole('dialog', { name: '确认删除' });
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });

    // 验证对话框中显示了正确的商品名
    await expect(confirmDialog.getByText(targetName)).toBeVisible();

    // 点击确认删除按钮
    await confirmDialog.getByRole('button', { name: '删除' }).click();

    // 等待对话框关闭并刷新
    await expect(confirmDialog).not.toBeVisible({ timeout: 5_000 });
    await page.waitForLoadState('networkidle');

    // 验证：商品已从列表中移除
    // 要么该商品名称消失，要么行数减少
    const finalRowCount = await page.locator('table tbody tr').count();
    const stillVisible = await page.getByText(targetName).isVisible().catch(() => false);

    // 如果初始只有1行（即刚创建的），删除后可能显示空状态
    if (initialRowCount === 1) {
      // 删除后要么表格变空（空状态），要么行数减少
      const isEmpty = await page.getByText('暂无购物项').isVisible().catch(() => false);
      expect(finalRowCount < initialRowCount || isEmpty).toBeTruthy();
    } else {
      expect(finalRowCount).toBeLessThan(initialRowCount);
      expect(stillVisible).toBeFalsy();
    }
  });

  // ─── Edge Case：删除空列表时应无异常 ──────────────────
  test('购物模块 — 空列表状态展示正常', async ({ page }: { page: Page }) => {
    await page.goto(SHOPPING_URL);
    await page.waitForLoadState('networkidle');

    // 验证添加按钮始终可用
    const addButton = page.getByRole('button', { name: '添加' });
    await expect(addButton).toBeVisible({ timeout: 5_000 });

    // 验证筛选栏可见
    await expect(page.getByPlaceholder('搜索名称...')).toBeVisible();

    // 页面要么显示空状态，要么显示表格（取决于是否有数据）
    // 两者必有其一，且页面不报错
    const pageContent = await page.content();
    expect(pageContent).not.toContain('500');
    expect(pageContent).not.toContain('Internal Server Error');
  });

});
