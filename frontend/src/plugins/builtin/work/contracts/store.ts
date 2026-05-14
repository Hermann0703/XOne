// 合同管理 Zustand Store
// 管理合同、全宗、分类、密级、里程碑的 CRUD 状态

import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client';

// ─── 类型定义 ───────────────────────────────────────

export interface Contract {
  id: number;
  contract_no: string;       // 合同编号
  contract_name: string;     // 合同名称
  fonds_id?: number;         // 全宗ID
  fonds_name?: string;
  category_id?: number;      // 分类ID
  category_name?: string;
  classification_id?: number; // 密级ID
  classification_name?: string;
  supplier_id?: string;      // 供应商ID (UUID)
  supplier?: string;         // 供应商名称（后端返回 supplier_rel.name）
  amount?: number;           // 采购金额
  currency?: string;         // 币种
  sign_date?: string;        // 签署日期
  start_date?: string;       // 服务开始日期
  end_date?: string;         // 服务结束日期
  contract_type?: string;    // 类型 (deprecated)
  contract_type_id?: number; // 合同类型ID (FK)
  contract_type_name?: string; // 合同类型名称
  status: string;            // 状态: draft/signed/in_progress/completed/terminated
  description?: string;      // 描述
  keywords?: string[];       // 关键词
  requirement_no?: string;   // 需求编号
  subject_no?: string;       // 标的编号
  procurement_no?: string;   // 采购记录编号
  subject_name?: string;     // 标的名称
  auto_renewal?: boolean;        // 是否启用自动续约
  renewal_remind_days?: number;  // 续约提醒天数
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
  due_date?: string;
  completed_date?: string;
  status: string;   // pending/completed
  remark?: string;
}

export interface DashboardSummary {
  total_contracts: number;
  total_amount: number;
  active_count: number;
  completed_count: number;
  terminated_count: number;
  draft_count: number;
}

export interface DashboardPerformance {
  on_time_rate: number;
  overdue_count: number;
  total_milestones: number;
  completed_milestones: number;
}

export interface ExpiringContract {
  id: number;
  contract_no: string;
  contract_name: string;
  end_date: string;
  days_left: number;
  amount?: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  performance: DashboardPerformance;
  by_type: Array<{ type: string; count: number }>;
  monthly_trends: Array<{ month: string; count: number }>;
  by_fonds: Array<{ fonds_name: string; count: number }>;
  expiring_soon: ExpiringContract[];
}

export interface Paging {
  total: number;
  total_pages: number;
  page: number;
  page_size: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  contact_phone?: string;
  address?: string;
  business_license?: string;
  tax_id?: string;
  bank_name?: string;
  bank_account?: string;
  dc_bank_name?: string;
  dc_bank_account?: string;
  rating?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Store 接口 ─────────────────────────────────────

interface ContractStore {
  // 列表状态
  contracts: Contract[];
  paging: Paging | null;
  loading: boolean;
  error: string | null;

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

  // 供应商
  suppliers: Supplier[];
  supplierPaging: Paging | null;
  supplierLoading: boolean;

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

  // ── 供应商 CRUD ──
  fetchSuppliers: (search?: string, status?: string, page?: number, pageSize?: number) => Promise<void>;
  createSupplier: (data: Partial<Supplier>) => Promise<Supplier | null>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<Supplier | null>;
  deleteSupplier: (id: string) => Promise<boolean>;
}

// ─── Store 实现 ─────────────────────────────────────

export const useContractStore = create<ContractStore>((set, get) => ({
  contracts: [],
  paging: null,
  loading: false,
  error: null,
  selectedContract: null,
  fonds: [],
  categories: [],
  classifications: [],
  milestones: [],
  dashboard: null,
  suppliers: [],
  supplierPaging: null,
  supplierLoading: false,

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
      // 后端返回业务错误（code != 0）
      set({ error: res.message || '创建合同失败' });
      console.error('[Store] createContract 业务错误:', res.code, res.message);
    } catch (error: unknown) {
      // HTTP 错误（422 验证失败 / 500 服务器错误 / 网络错误）
      const errResponse = (error as any)?.response;
      const status = errResponse?.status;
      if (errResponse?.data) {
        const errData = errResponse.data;
        // FastAPI 422: {"detail": [{"msg": "..."}]} → 拼接字段级错误
        if (status === 422 && Array.isArray(errData.detail)) {
          const messages = errData.detail.map((d: any) => d.msg || JSON.stringify(d));
          set({ error: messages.join('; ') });
        } else if (status >= 500) {
          set({ error: '服务器内部错误，请联系管理员' });
          console.error(`[Store] createContract HTTP ${status}:`, errData);
        } else {
          set({ error: errData.message || errData.detail || '创建合同失败' });
        }
      } else if (status) {
        set({ error: `请求失败 (${status})` });
      } else {
        set({ error: '网络连接失败，请检查后端服务' });
      }
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
      // 后端返回业务错误（code != 0）
      set({ error: res.message || '更新合同失败' });
      console.error('[Store] updateContract 业务错误:', res.code, res.message);
    } catch (error: unknown) {
      // HTTP 错误（422 验证失败 / 500 服务器错误 / 网络错误）
      const errResponse = (error as any)?.response;
      const status = errResponse?.status;
      if (errResponse?.data) {
        const errData = errResponse.data;
        // FastAPI 422: {"detail": [{"msg": "..."}]} → 拼接字段级错误
        if (status === 422 && Array.isArray(errData.detail)) {
          const messages = errData.detail.map((d: any) => d.msg || JSON.stringify(d));
          set({ error: messages.join('; ') });
        } else if (status >= 500) {
          // 5xx: 隐藏内部细节，给出可操作提示
          set({ error: '服务器内部错误，请联系管理员' });
          console.error(`[Store] updateContract HTTP ${status}:`, errData);
        } else {
          set({ error: errData.message || errData.detail || '更新合同失败' });
        }
      } else if (status) {
        set({ error: `请求失败 (${status})` });
      } else {
        set({ error: '网络连接失败，请检查后端服务' });
      }
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
      const res = await apiGet<Fonds[]>('/work/contracts/fonds');
      if (res.code === 0) set({ fonds: res.data });
    } catch { /* 静默处理 */ }
  },

  createFonds: async (data) => {
    try {
      const res = await apiPost<Fonds>('/work/contracts/fonds', data);
      if (res.code === 0) {
        set({ fonds: [...get().fonds, res.data] });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  updateFonds: async (id, data) => {
    try {
      const res = await apiPatch<Fonds>(`/work/contracts/fonds/${id}`, data);
      if (res.code === 0) {
        set({ fonds: get().fonds.map((f) => (f.id === id ? res.data : f)) });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  deleteFonds: async (id) => {
    try {
      const res = await apiDelete(`/work/contracts/fonds/${id}`);
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
      const res = await apiGet<ContractCategory[]>('/work/contracts/categories');
      if (res.code === 0) set({ categories: res.data });
    } catch { /* 静默处理 */ }
  },

  createCategory: async (data) => {
    try {
      const res = await apiPost<ContractCategory>('/work/contracts/categories', data);
      if (res.code === 0) {
        set({ categories: [...get().categories, res.data] });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  updateCategory: async (id, data) => {
    try {
      const res = await apiPatch<ContractCategory>(`/work/contracts/categories/${id}`, data);
      if (res.code === 0) {
        set({ categories: get().categories.map((c) => (c.id === id ? res.data : c)) });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  deleteCategory: async (id) => {
    try {
      const res = await apiDelete(`/work/contracts/categories/${id}`);
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
      const res = await apiGet<Classification[]>('/work/contracts/classifications');
      if (res.code === 0) set({ classifications: res.data });
    } catch { /* 静默处理 */ }
  },

  createClassification: async (data) => {
    try {
      const res = await apiPost<Classification>('/work/contracts/classifications', data);
      if (res.code === 0) {
        set({ classifications: [...get().classifications, res.data] });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  updateClassification: async (id, data) => {
    try {
      const res = await apiPatch<Classification>(`/work/contracts/classifications/${id}`, data);
      if (res.code === 0) {
        set({ classifications: get().classifications.map((c) => (c.id === id ? res.data : c)) });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  deleteClassification: async (id) => {
    try {
      const res = await apiDelete(`/work/contracts/classifications/${id}`);
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
      const res = await apiPatch<Milestone>(`/work/contracts/milestones/${id}`, data);
      if (res.code === 0) {
        set({ milestones: get().milestones.map((m) => (m.id === id ? res.data : m)) });
        return res.data;
      }
    } catch { /* 静默处理 */ }
    return null;
  },

  deleteMilestone: async (id) => {
    try {
      const res = await apiDelete(`/work/contracts/milestones/${id}`);
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

  // ── 供应商 CRUD ──

  fetchSuppliers: async (search = '', status = '', page = 1, pageSize = 15) => {
    set({ supplierLoading: true });
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await apiGet<Supplier[]>('/work/contracts/suppliers', params);
      if (res.code === 0) {
        set({ suppliers: res.data, supplierPaging: res.paging || null });
      }
    } catch { /* 静默处理 */ } finally {
      set({ supplierLoading: false });
    }
  },

  createSupplier: async (data) => {
    try {
      const res = await apiPost<Supplier>('/work/contracts/suppliers', data);
      if (res.code === 0) {
        const { suppliers } = get();
        set({ suppliers: [res.data, ...suppliers] });
        return res.data;
      }
      console.error('[Store] createSupplier 业务错误:', res.message);
    } catch (e: unknown) {
      console.error('[Store] createSupplier 请求失败:', e);
    }
    return null;
  },

  updateSupplier: async (id, data) => {
    try {
      const res = await apiPatch<Supplier>(`/work/contracts/suppliers/${id}`, data);
      if (res.code === 0) {
        const { suppliers } = get();
        set({ suppliers: suppliers.map((s) => (s.id === id ? res.data : s)) });
        return res.data;
      }
      console.error('[Store] updateSupplier 业务错误:', res.message);
    } catch (e: unknown) {
      console.error('[Store] updateSupplier 请求失败:', e);
    }
    return null;
  },

  deleteSupplier: async (id) => {
    try {
      const res = await apiDelete(`/work/contracts/suppliers/${id}`);
      if (res.code === 0) {
        const { suppliers } = get();
        set({ suppliers: suppliers.filter((s) => s.id !== id) });
        return true;
      }
      console.error('[Store] deleteSupplier 业务错误:', res.message);
    } catch (e: unknown) {
      console.error('[Store] deleteSupplier 请求失败:', e);
    }
    return false;
  },
}));

// ─── 时间轴模板类型 ─────────────────────────────────

export interface TimelineTemplate {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  nodes?: TimelineNode[];
  created_at: string;
  updated_at: string;
}

export interface TimelineNode {
  id: number;
  template_id: number;
  label: string;
  sort_order: number;
  date_source?: string;
  active_statuses?: string[];
  icon_type: string;
  is_required: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractTimelineCustomNode {
  id: number;
  contract_id: number;
  label: string;
  date_value?: string;
  sort_order: number;
  icon_type: string;
}
