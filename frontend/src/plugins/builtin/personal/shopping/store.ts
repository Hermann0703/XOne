// 购物管理 Zustand Store
// 管理购物清单、预算的 CRUD 状态

import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client';

// ─── 类型定义 ───────────────────────────────────────

export interface ShoppingItem {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'purchased' | 'cancelled';
  store?: string;
  url?: string;
  notes?: string;
  budget_id?: number;
  created_date?: string;
  purchased_date?: string;
  budget?: Budget | null;
}

export interface Budget {
  id: number;
  name: string;
  amount: number;
  category?: string;
  period: 'monthly' | 'weekly' | 'yearly';
  start_date?: string;
  end_date?: string;
  notes?: string;
  is_active: boolean;
}

export interface DashboardData {
  total_items: number;
  total_purchased: number;
  total_pending: number;
  total_cancelled: number;
  total_spent: number;
  budgets: Array<Budget & { spent: number; remaining: number; percentage: number }>;
}

// ─── Store 接口 ─────────────────────────────────────

interface ShoppingStore {
  // 列表状态
  items: ShoppingItem[];
  loading: boolean;

  // 编辑中的条目
  editingItem: ShoppingItem | null;

  // 预算
  budgets: Budget[];
  budgetsLoading: boolean;
  editingBudget: Budget | null;

  // 仪表盘
  dashboard: DashboardData | null;
  dashboardLoading: boolean;

  // ── 购物项 CRUD ──
  fetchItems: (params?: Record<string, unknown>) => Promise<void>;
  fetchItem: (id: number) => Promise<ShoppingItem | null>;
  createItem: (data: Partial<ShoppingItem>) => Promise<ShoppingItem | null>;
  updateItem: (id: number, data: Partial<ShoppingItem>) => Promise<ShoppingItem | null>;
  deleteItem: (id: number) => Promise<boolean>;

  // ── 预算 CRUD ──
  fetchBudgets: () => Promise<void>;
  fetchBudget: (id: number) => Promise<Budget | null>;
  createBudget: (data: Partial<Budget>) => Promise<Budget | null>;
  updateBudget: (id: number, data: Partial<Budget>) => Promise<Budget | null>;
  deleteBudget: (id: number) => Promise<boolean>;

  // ── 仪表盘 ──
  fetchDashboard: () => Promise<void>;

  // ── 选择器 ──
  setEditingItem: (item: ShoppingItem | null) => void;
  setEditingBudget: (b: Budget | null) => void;
}

// ─── Store 实现 ─────────────────────────────────────

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],
  loading: false,
  editingItem: null,
  budgets: [],
  budgetsLoading: false,
  editingBudget: null,
  dashboard: null,
  dashboardLoading: false,

  // ── 购物项 CRUD ──

  fetchItems: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await apiGet<ShoppingItem[]>('/personal/shopping/items', params);
      if (res.code === 0) {
        // Sort: high priority first, then by created_date desc
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        const sorted = [...(res.data || [])].sort((a, b) => {
          const pa = priorityOrder[a.priority] ?? 3;
          const pb = priorityOrder[b.priority] ?? 3;
          if (pa !== pb) return pa - pb;
          const da = a.created_date ? new Date(a.created_date).getTime() : 0;
          const db = b.created_date ? new Date(b.created_date).getTime() : 0;
          return db - da;
        });
        set({ items: sorted });
      }
    } catch {
      // 静默处理
    } finally {
      set({ loading: false });
    }
  },

  fetchItem: async (id) => {
    try {
      const res = await apiGet<ShoppingItem>(`/personal/shopping/items/${id}`);
      if (res.code === 0) {
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  createItem: async (data) => {
    try {
      const res = await apiPost<ShoppingItem>('/personal/shopping/items', data);
      if (res.code === 0) {
        const { items } = get();
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        const sorted = [res.data, ...items].sort((a, b) => {
          const pa = priorityOrder[a.priority] ?? 3;
          const pb = priorityOrder[b.priority] ?? 3;
          if (pa !== pb) return pa - pb;
          const da = a.created_date ? new Date(a.created_date).getTime() : 0;
          const db = b.created_date ? new Date(b.created_date).getTime() : 0;
          return db - da;
        });
        set({ items: sorted });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  updateItem: async (id, data) => {
    try {
      const res = await apiPatch<ShoppingItem>(`/personal/shopping/items/${id}`, data);
      if (res.code === 0) {
        const { items, editingItem } = get();
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        const sorted = items.map((c) => (c.id === id ? res.data : c)).sort((a, b) => {
          const pa = priorityOrder[a.priority] ?? 3;
          const pb = priorityOrder[b.priority] ?? 3;
          if (pa !== pb) return pa - pb;
          const da = a.created_date ? new Date(a.created_date).getTime() : 0;
          const db = b.created_date ? new Date(b.created_date).getTime() : 0;
          return db - da;
        });
        set({
          items: sorted,
          editingItem: editingItem?.id === id ? res.data : editingItem,
        });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  deleteItem: async (id) => {
    try {
      const res = await apiDelete(`/personal/shopping/items/${id}`);
      if (res.code === 0) {
        const { items } = get();
        set({ items: items.filter((c) => c.id !== id) });
        return true;
      }
    } catch {
      // 静默处理
    }
    return false;
  },

  // ── 预算 CRUD ──

  fetchBudgets: async () => {
    set({ budgetsLoading: true });
    try {
      const res = await apiGet<Budget[]>('/personal/shopping/budgets');
      if (res.code === 0) {
        set({ budgets: res.data || [] });
      }
    } catch {
      // 静默处理
    } finally {
      set({ budgetsLoading: false });
    }
  },

  fetchBudget: async (id) => {
    try {
      const res = await apiGet<Budget>(`/personal/shopping/budgets/${id}`);
      if (res.code === 0) {
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  createBudget: async (data) => {
    try {
      const res = await apiPost<Budget>('/personal/shopping/budgets', data);
      if (res.code === 0) {
        const { budgets } = get();
        set({ budgets: [...budgets, res.data] });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  updateBudget: async (id, data) => {
    try {
      const res = await apiPatch<Budget>(`/personal/shopping/budgets/${id}`, data);
      if (res.code === 0) {
        const { budgets, editingBudget } = get();
        set({
          budgets: budgets.map((b) => (b.id === id ? res.data : b)),
          editingBudget: editingBudget?.id === id ? res.data : editingBudget,
        });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  deleteBudget: async (id) => {
    try {
      const res = await apiDelete(`/personal/shopping/budgets/${id}`);
      if (res.code === 0) {
        const { budgets } = get();
        set({ budgets: budgets.filter((b) => b.id !== id) });
        return true;
      }
    } catch {
      // 静默处理
    }
    return false;
  },

  // ── 仪表盘 ──

  fetchDashboard: async () => {
    set({ dashboardLoading: true });
    try {
      const res = await apiGet<DashboardData>('/personal/shopping/dashboard');
      if (res.code === 0) {
        set({ dashboard: res.data });
      }
    } catch {
      // 静默处理
    } finally {
      set({ dashboardLoading: false });
    }
  },

  // ── 选择器 ──

  setEditingItem: (item) => set({ editingItem: item }),
  setEditingBudget: (b) => set({ editingBudget: b }),
}));
