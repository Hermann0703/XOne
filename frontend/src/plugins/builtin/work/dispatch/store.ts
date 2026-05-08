// 数据报送管理 Zustand Store
// 管理数据源、任务、日志、监控的 CRUD 状态

import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client';

const API_PREFIX = '/work/dispatch';

// ─── 类型定义 ───────────────────────────────────────

export interface DataSource {
  id: number;
  name: string;
  source_type: string;
  connection_config: Record<string, unknown>;
  status: string;           // active / inactive / error
  description?: string;
  last_run_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DispatchTask {
  id: number;
  name: string;
  data_source_id: number;
  data_source_name?: string;
  schedule?: string;
  target_table?: string;
  query_sql?: string;
  endpoint_url?: string;
  status: string;           // active / paused / error
  description?: string;
  last_run_at?: string;
  next_run_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DispatchLog {
  id: number;
  task_id: number;
  task_name?: string;
  data_source_name?: string;
  status: string;           // success / failed
  message?: string;
  rows_affected?: number;
  duration_ms?: number;
  created_at?: string;
}

export interface MonitoringData {
  active_sources: number;
  active_tasks: number;
  today_executions: number;
  success_rate: number;
  recent_logs?: DispatchLog[];
}

export interface OverviewData {
  total_sources: number;
  total_tasks: number;
  total_executions: number;
  success_rate: number;
  by_status?: Record<string, number>;
  by_source_type?: Record<string, number>;
}

export interface Paging {
  total: number;
  page: number;
  size: number;
}

// ─── Store 接口 ─────────────────────────────────────

interface DispatchStore {
  // 列表状态
  sources: DataSource[];
  tasks: DispatchTask[];
  logs: DispatchLog[];
  monitoring: MonitoringData;
  overview: OverviewData;
  paging: Paging | null;
  loading: boolean;

  // ── 数据源 CRUD ──
  fetchSources: (params?: Record<string, unknown>) => Promise<void>;
  createSource: (data: Partial<DataSource>) => Promise<DataSource | null>;
  updateSource: (id: number, data: Partial<DataSource>) => Promise<DataSource | null>;
  deleteSource: (id: number) => Promise<boolean>;

  // ── 任务 CRUD ──
  fetchTasks: (params?: Record<string, unknown>) => Promise<void>;
  createTask: (data: Partial<DispatchTask>) => Promise<DispatchTask | null>;
  updateTask: (id: number, data: Partial<DispatchTask>) => Promise<DispatchTask | null>;
  deleteTask: (id: number) => Promise<boolean>;
  executeTask: (id: number) => Promise<boolean>;

  // ── 日志 ──
  fetchLogs: (params?: Record<string, unknown>) => Promise<void>;

  // ── 监控 & 概览 ──
  fetchMonitoring: () => Promise<void>;
  fetchOverview: () => Promise<void>;
}

// ─── Store 实现 ─────────────────────────────────────

export const useDispatchStore = create<DispatchStore>((set, get) => ({
  sources: [],
  tasks: [],
  logs: [],
  monitoring: {} as MonitoringData,
  overview: {} as OverviewData,
  paging: null,
  loading: false,

  // ── 数据源 CRUD ──

  fetchSources: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await apiGet<DataSource[]>(`${API_PREFIX}/sources`, params);
      if (res.code === 0) {
        set({ sources: res.data, paging: res.paging || null });
      }
    } catch {
      // 静默处理
    } finally {
      set({ loading: false });
    }
  },

  createSource: async (data) => {
    try {
      const res = await apiPost<DataSource>(`${API_PREFIX}/sources`, data);
      if (res.code === 0) {
        const { sources } = get();
        set({ sources: [res.data, ...sources] });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  updateSource: async (id, data) => {
    try {
      const res = await apiPatch<DataSource>(`${API_PREFIX}/sources/${id}`, data);
      if (res.code === 0) {
        const { sources } = get();
        set({ sources: sources.map((s) => (s.id === id ? res.data : s)) });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  deleteSource: async (id) => {
    try {
      const res = await apiDelete(`${API_PREFIX}/sources/${id}`);
      if (res.code === 0) {
        const { sources } = get();
        set({ sources: sources.filter((s) => s.id !== id) });
        return true;
      }
    } catch {
      // 静默处理
    }
    return false;
  },

  // ── 任务 CRUD ──

  fetchTasks: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await apiGet<DispatchTask[]>(`${API_PREFIX}/tasks`, params);
      if (res.code === 0) {
        set({ tasks: res.data, paging: res.paging || null });
      }
    } catch {
      // 静默处理
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (data) => {
    try {
      const res = await apiPost<DispatchTask>(`${API_PREFIX}/tasks`, data);
      if (res.code === 0) {
        const { tasks } = get();
        set({ tasks: [res.data, ...tasks] });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  updateTask: async (id, data) => {
    try {
      const res = await apiPatch<DispatchTask>(`${API_PREFIX}/tasks/${id}`, data);
      if (res.code === 0) {
        const { tasks } = get();
        set({ tasks: tasks.map((t) => (t.id === id ? res.data : t)) });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  deleteTask: async (id) => {
    try {
      const res = await apiDelete(`${API_PREFIX}/tasks/${id}`);
      if (res.code === 0) {
        const { tasks } = get();
        set({ tasks: tasks.filter((t) => t.id !== id) });
        return true;
      }
    } catch {
      // 静默处理
    }
    return false;
  },

  executeTask: async (id) => {
    try {
      const res = await apiPost(`${API_PREFIX}/tasks/${id}/execute`);
      if (res.code === 0) return true;
    } catch {
      // 静默处理
    }
    return false;
  },

  // ── 日志 ──

  fetchLogs: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await apiGet<DispatchLog[]>(`${API_PREFIX}/logs`, params);
      if (res.code === 0) {
        set({ logs: res.data, paging: res.paging || null });
      }
    } catch {
      // 静默处理
    } finally {
      set({ loading: false });
    }
  },

  // ── 监控 & 概览 ──

  fetchMonitoring: async () => {
    try {
      const res = await apiGet<MonitoringData>(`${API_PREFIX}/monitoring`);
      if (res.code === 0) set({ monitoring: res.data });
    } catch {
      // 静默处理
    }
  },

  fetchOverview: async () => {
    try {
      const res = await apiGet<OverviewData>(`${API_PREFIX}/overview`);
      if (res.code === 0) set({ overview: res.data });
    } catch {
      // 静默处理
    }
  },
}));
