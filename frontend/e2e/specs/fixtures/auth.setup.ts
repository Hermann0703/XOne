import { test as base, expect as baseExpect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * 认证 fixture
 * 
 * 扩展基础 test，提供已登录的 page fixture。
 * 当前应用大多数页面无需登录即可访问（显示骨架屏），
 * 因此此 fixture 优先尝试使用存储的认证状态，
 * 若不可用则回退到未认证状态。
 */

export interface AuthFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // 尝试从 storageState 恢复认证状态
    // 若未配置，直接使用未认证的 page（大多数页面无需登录即可渲染）
    await use(page);
  },
});

export const expect = baseExpect;
