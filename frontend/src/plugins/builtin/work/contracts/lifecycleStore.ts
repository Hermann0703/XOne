// 合同生命周期管理 Zustand Store
// 管理生命周期模板和阶段的 CRUD 状态

import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '@/lib/api/client';

// ─── 类型定义 ───────────────────────────────────────

export interface LifecycleStage {
  id: number;
  template_id: number;
  name: string;
  stage_type: string;
  sort_order: number;
  description?: string;
  color?: string;
  is_required: boolean;
  auto_transition_days: number;
  created_at?: string;
  updated_at?: string;
}

export interface LifecycleTemplate {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  stages: LifecycleStage[];
  created_at?: string;
  updated_at?: string;
}

// ─── Store 接口 ─────────────────────────────────────

interface LifecycleStore {
  // 状态
  templates: LifecycleTemplate[];
  loading: boolean;
  error: string | null;

  // 模板 CRUD
  fetchTemplates: () => Promise<void>;
  createTemplate: (data: Partial<LifecycleTemplate>) => Promise<LifecycleTemplate | null>;
  updateTemplate: (id: number, data: Partial<LifecycleTemplate>) => Promise<LifecycleTemplate | null>;
  deleteTemplate: (id: number) => Promise<boolean>;

  // 阶段 CRUD
  addStage: (templateId: number, data: Partial<LifecycleStage>) => Promise<LifecycleStage | null>;
  updateStage: (templateId: number, stageId: number, data: Partial<LifecycleStage>) => Promise<LifecycleStage | null>;
  deleteStage: (templateId: number, stageId: number) => Promise<boolean>;
  reorderStages: (templateId: number, stageIds: number[]) => Promise<boolean>;
}

// ─── Store 实现 ─────────────────────────────────────

export const useLifecycleStore = create<LifecycleStore>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  // ── 模板 CRUD ──

  fetchTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiGet<LifecycleTemplate[]>('/work/contracts/lifecycle/templates');
      if (res.code === 0) {
        set({ templates: res.data });
      } else {
        console.error('[LifecycleStore] fetchTemplates 业务错误:', res.message);
        set({ error: res.message });
      }
    } catch (e: unknown) {
      console.error('[LifecycleStore] fetchTemplates 请求失败:', e);
      set({ error: '获取模板列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  createTemplate: async (data) => {
    try {
      const res = await apiPost<LifecycleTemplate>('/work/contracts/lifecycle/templates', data);
      if (res.code === 0) {
        const { templates } = get();
        set({ templates: [...templates, res.data] });
        return res.data;
      }
      console.error('[LifecycleStore] createTemplate 业务错误:', res.message);
    } catch (e: unknown) {
      console.error('[LifecycleStore] createTemplate 请求失败:', e);
    }
    return null;
  },

  updateTemplate: async (id, data) => {
    try {
      const res = await apiPatch<LifecycleTemplate>(`/work/contracts/lifecycle/templates/${id}`, data);
      if (res.code === 0) {
        const { templates } = get();
        set({
          templates: templates.map((t) => (t.id === id ? res.data : t)),
        });
        return res.data;
      }
      console.error('[LifecycleStore] updateTemplate 业务错误:', res.message);
    } catch (e: unknown) {
      console.error('[LifecycleStore] updateTemplate 请求失败:', e);
    }
    return null;
  },

  deleteTemplate: async (id) => {
    try {
      const res = await apiDelete(`/work/contracts/lifecycle/templates/${id}`);
      if (res.code === 0) {
        const { templates } = get();
        set({ templates: templates.filter((t) => t.id !== id) });
        return true;
      }
      console.error('[LifecycleStore] deleteTemplate 业务错误:', res.message);
    } catch (e: unknown) {
      console.error('[LifecycleStore] deleteTemplate 请求失败:', e);
    }
    return false;
  },

  // ── 阶段 CRUD ──

  addStage: async (templateId, data) => {
    try {
      const res = await apiPost<LifecycleStage>(
        `/work/contracts/lifecycle/templates/${templateId}/stages`,
        data,
      );
      if (res.code === 0) {
        const { templates } = get();
        set({
          templates: templates.map((t) => {
            if (t.id === templateId) {
              return { ...t, stages: [...t.stages, res.data] };
            }
            return t;
          }),
        });
        return res.data;
      }
      console.error('[LifecycleStore] addStage 业务错误:', res.message);
    } catch (e: unknown) {
      console.error('[LifecycleStore] addStage 请求失败:', e);
    }
    return null;
  },

  updateStage: async (templateId, stageId, data) => {
    try {
      const res = await apiPatch<LifecycleStage>(
        `/work/contracts/lifecycle/templates/${templateId}/stages/${stageId}`,
        data,
      );
      if (res.code === 0) {
        const { templates } = get();
        set({
          templates: templates.map((t) => {
            if (t.id === templateId) {
              return {
                ...t,
                stages: t.stages.map((s) => (s.id === stageId ? res.data : s)),
              };
            }
            return t;
          }),
        });
        return res.data;
      }
      console.error('[LifecycleStore] updateStage 业务错误:', res.message);
    } catch (e: unknown) {
      console.error('[LifecycleStore] updateStage 请求失败:', e);
    }
    return null;
  },

  deleteStage: async (templateId, stageId) => {
    try {
      const res = await apiDelete(
        `/work/contracts/lifecycle/templates/${templateId}/stages/${stageId}`,
      );
      if (res.code === 0) {
        const { templates } = get();
        set({
          templates: templates.map((t) => {
            if (t.id === templateId) {
              return {
                ...t,
                stages: t.stages.filter((s) => s.id !== stageId),
              };
            }
            return t;
          }),
        });
        return true;
      }
      console.error('[LifecycleStore] deleteStage 业务错误:', res.message);
    } catch (e: unknown) {
      console.error('[LifecycleStore] deleteStage 请求失败:', e);
    }
    return false;
  },

  reorderStages: async (templateId, stageIds) => {
    try {
      const res = await apiPut(
        `/work/contracts/lifecycle/templates/${templateId}/stages/reorder`,
        { stage_ids: stageIds },
      );
      if (res.code === 0) {
        // 重新排序后刷新模板列表以获取最新的 sort_order
        const { fetchTemplates } = get();
        await fetchTemplates();
        return true;
      }
      console.error('[LifecycleStore] reorderStages 业务错误:', res.message);
    } catch (e: unknown) {
      console.error('[LifecycleStore] reorderStages 请求失败:', e);
    }
    return false;
  },
}));
