// 合同管理 Zustand Store
// 管理合同、全宗、分类、密级、里程碑的 CRUD 状态

import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client';

// ─── 类型定义 ───────────────────────────────────────

export interface Contract {
  id: number;
  contract_no: string;     // 合同编号
  title: string;           // 标题
  fonds_id?: number;       // 全宗ID
  fonds_name?: string;
  category_id?: number;    // 分类ID
  category_name?: string;
  classification_id?: number; // 密级ID
  classification_name?: string;
  party_a?: string;        // 甲方
  party_b?: string;        // 乙方
  amount?: number;         // 金额
  currency?: string;       // 币种
  sign_date?: string;      // 签署日期
  start_date?: string;     // 开始日期
  end_date?: string;       // 结束日期
  contract_type?: string;  // 类型
  status: string;          // 状态: draft/signed/in_progress/completed/terminated
  description?: string;    // 描述
  keywords?: string[];     // 关键词
  created_at?: string;
  updated_at?: string;
}

export interface Fonds {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface ContractCategory {
  id: number;
  name: string;
  code: string;
  fonds_id?: number;
  parent_id?: number;
}

export interface Classification {
  id: number;
  name: string;
  code: string;
  level: number;    // 1-5
  description?: string;
}

export interface Milestone {
  id: number;
  contract_id: number;
  name: string;
  amount?: number;
  planned_date?: string;
  completed_date?: string;
  status: string;   // pending/completed
  remark?: string;
}

export interface DashboardData {
  total_contracts: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  expiring_count: number;
  monthly_trends: Array<{ month: string; count: number }>;
  by_fonds: Record<string, number>;
}

export interface Paging {
  total: number;
  page: number;
  size: number;
}

// ─── Store 接口 ─────────────────────────────────────

interface ContractStore {
  // 列表状态
  contracts: Contract[];
  paging: Paging | null;
  loading: boolean;

  // 详情
  selectedContract: Contract | null;

  // 基础数据
  fonds: Fonds[];
  categories: ContractCategory[];
  classifications: Classification[];

  // 里程碑
  milestones: Milestone[];

  // 仪表盘
  dashboard: DashboardData | null;

  // ── 合同 CRUD ──
  fetchContracts: (params?: Record<string, unknown>) => Promise<void>;
  fetchContract: (id: number) => Promise<Contract | null>;
  createContract: (data: Partial<Contract>) => Promise<Contract | null>;
  updateContract: (id: number, data: Partial<Contract>) => Promise<Contract | null>;
  deleteContract: (id: number) => Promise<boolean>;

  // ── 全宗 CRUD ──
  fetchFonds: () => Promise<void>;
  createFonds: (data: Partial<Fonds>) => Promise<Fonds | null>;
  updateFonds: (id: number, data: Partial<Fonds>) => Promise<Fonds | null>;
  deleteFonds: (id: number) => Promise<boolean>;

  // ── 分类 CRUD ──
  fetchCategories: () => Promise<void>;
  createCategory: (data: Partial<ContractCategory>) => Promise<ContractCategory | null>;
  updateCategory: (id: number, data: Partial<ContractCategory>) => Promise<ContractCategory | null>;
  deleteCategory: (id: number) => Promise<boolean>;

  // ── 密级 CRUD ──
  fetchClassifications: () => Promise<void>;
  createClassification: (data: Partial<Classification>) => Promise<Classification | null>;
  updateClassification: (id: number, data: Partial<Classification>) => Promise<Classification | null>;
  deleteClassification: (id: number) => Promise<boolean>;

  // ── 里程碑 ──
  fetchMilestones: (contractId: number) => Promise<void>;
  createMilestone: (data: Partial<Milestone>) => Promise<Milestone | null>;
  updateMilestone: (id: number, data: Partial<Milestone>) => Promise<Milestone | null>;
  deleteMilestone: (id: number) => Promise<boolean>;

  // ── 仪表盘 ──
  fetchDashboard: () => Promise<void>;

  // ── 选择器 ──
  setSelectedContract: (c: Contract | null) => void;
}

// ─── Store 实现 ─────────────────────────────────────

export const useContractStore = create<ContractStore>((set, get) => ({
  contracts: [],
  paging: null,
  loading: false,
  selectedContract: null,
  fonds: [],
  categories: [],
  classifications: [],
  milestones: [],
  dashboard: null,

  // ── 合同 CRUD ──

  fetchContracts: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await apiGet<Contract[]>('/work/contracts', params);
      if (res.code === 0) {
        set({ contracts: res.data, paging: res.paging || null });
      }
    } catch {
      // 静默处理
    } finally {
      set({ loading: false });
    }
  },

  fetchContract: async (id) => {
    try {
      const res = await apiGet<Contract>(`/work/contracts/${id}`);
      if (res.code === 0) {
        set({ selectedContract: res.data });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  createContract: async (data) => {
    try {
      const res = await apiPost<Contract>('/work/contracts', data);
      if (res.code === 0) {
        const { contracts } = get();
        set({ contracts: [res.data, ...contracts] });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  updateContract: async (id, data) => {
    try {
      const res = await apiPatch<Contract>(`/work/contracts/${id}`, data);
      if (res.code === 0) {
        const { contracts, selectedContract } = get();
        set({
          contracts: contracts.map((c) => (c.id === id ? res.data : c)),
          selectedContract: selectedContract?.id === id ? res.data : selectedContract,
        });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  deleteContract: async (id) => {
    try {
      const res = await apiDelete(`/work/contracts/${id}`);
      if (res.code === 0) {
        const { contracts } = get();
        set({ contracts: contracts.filter((c) => c.id !== id) });
        return true;
      }
    } catch {
      // 静默处理
    }
    return false;
  },

  // ── 全宗 CRUD ──

  fetchFonds: async () => {
    try {
      const res = await apiGet<Fonds[]>('/work/fonds');
      if (res.code === 0) set({ fonds: res.data });
    } catch { /* 静默处理 */ }
  },

  createFonds: async (data) => {
    try {
      const res = await apiPost<Fonds>('/work/fonds', data);
      if (res.code === 0) {
        set({ fonds: [...get().fonds, res.data] });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  updateFonds: async (id, data) => {
    try {
      const res = await apiPatch<Fonds>(`/work/fonds/${id}`, data);
      if (res.code === 0) {
        set({ fonds: get().fonds.map((f) => (f.id === id ? res.data : f)) });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  deleteFonds: async (id) => {
    try {
      const res = await apiDelete(`/work/fonds/${id}`);
      if (res.code === 0) {
        set({ fonds: get().fonds.filter((f) => f.id !== id) });
        return true;
      }
    } catch { /* 静默处理 */ }
    return false;
  },

  // ── 分类 CRUD ──

  fetchCategories: async () => {
    try {
      const res = await apiGet<ContractCategory[]>('/work/categories');
      if (res.code === 0) set({ categories: res.data });
    } catch { /* 静默处理 */ }
  },

  createCategory: async (data) => {
    try {
      const res = await apiPost<ContractCategory>('/work/categories', data);
      if (res.code === 0) {
        set({ categories: [...get().categories, res.data] });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  updateCategory: async (id, data) => {
    try {
      const res = await apiPatch<ContractCategory>(`/work/categories/${id}`, data);
      if (res.code === 0) {
        set({ categories: get().categories.map((c) => (c.id === id ? res.data : c)) });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  deleteCategory: async (id) => {
    try {
      const res = await apiDelete(`/work/categories/${id}`);
      if (res.code === 0) {
        set({ categories: get().categories.filter((c) => c.id !== id) });
        return true;
      }
    } catch { /* 静默处理 */ }
    return false;
  },

  // ── 密级 CRUD ──

  fetchClassifications: async () => {
    try {
      const res = await apiGet<Classification[]>('/work/classifications');
      if (res.code === 0) set({ classifications: res.data });
    } catch { /* 静默处理 */ }
  },

  createClassification: async (data) => {
    try {
      const res = await apiPost<Classification>('/work/classifications', data);
      if (res.code === 0) {
        set({ classifications: [...get().classifications, res.data] });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  updateClassification: async (id, data) => {
    try {
      const res = await apiPatch<Classification>(`/work/classifications/${id}`, data);
      if (res.code === 0) {
        set({ classifications: get().classifications.map((c) => (c.id === id ? res.data : c)) });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  deleteClassification: async (id) => {
    try {
      const res = await apiDelete(`/work/classifications/${id}`);
      if (res.code === 0) {
        set({ classifications: get().classifications.filter((c) => c.id !== id) });
        return true;
      }
    } catch { /* 静默处理 */ }
    return false;
  },

  // ── 里程碑 ──

  fetchMilestones: async (contractId) => {
    try {
      const res = await apiGet<Milestone[]>(`/work/contracts/${contractId}/milestones`);
      if (res.code === 0) set({ milestones: res.data });
    } catch { /* 静默处理 */ }
  },

  createMilestone: async (data) => {
    try {
      const contractId = data.contract_id!;
      const res = await apiPost<Milestone>(`/work/contracts/${contractId}/milestones`, data);
      if (res.code === 0) {
        set({ milestones: [...get().milestones, res.data] });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  updateMilestone: async (id, data) => {
    try {
      const res = await apiPatch<Milestone>(`/work/milestones/${id}`, data);
      if (res.code === 0) {
        set({ milestones: get().milestones.map((m) => (m.id === id ? res.data : m)) });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  deleteMilestone: async (id) => {
    try {
      const res = await apiDelete(`/work/milestones/${id}`);
      if (res.code === 0) {
        set({ milestones: get().milestones.filter((m) => m.id !== id) });
        return true;
      }
    } catch { /* 静默处理 */ }
    return false;
  },

  // ── 仪表盘 ──

  fetchDashboard: async () => {
    try {
      const res = await apiGet<DashboardData>('/work/contracts/dashboard');
      if (res.code === 0) set({ dashboard: res.data });
    } catch { /* 静默处理 */ }
  },

  // ── 选择器 ──

  setSelectedContract: (c) => set({ selectedContract: c }),
}));
