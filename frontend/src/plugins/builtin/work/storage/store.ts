// 档案柜/档案盒管理 Zustand Store
// 管理档案柜与档案盒的 CRUD 状态及统计

import { create } from 'zustand';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client';

const API_PREFIX = '/work/storage';

// ─── 类型定义 ───────────────────────────────────────

export interface Cabinet {
  id: number;
  name: string;
  code: string;
  location: string;
  floor?: string;
  room?: string;
  description?: string;
  box_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Box {
  id: number;
  cabinet_id: number;
  box_no: string;
  row?: string;
  col?: string;
  layer?: string;
  barcode?: string;
  status: string;           // empty / partial / full
  description?: string;
  created_at?: string;
}

export interface StorageStats {
  total_cabinets: number;
  total_boxes: number;
  empty_boxes: number;
  partial_boxes: number;
  full_boxes: number;
}

// ─── Store 接口 ─────────────────────────────────────

interface StorageStore {
  // 列表状态
  cabinets: Cabinet[];
  boxes: Box[];
  stats: StorageStats | null;
  loading: boolean;

  // 当前选中的档案柜 (用于查看其档案盒)
  selectedCabinetId: number | null;

  // ── 档案柜 CRUD ──
  fetchCabinets: (params?: Record<string, unknown>) => Promise<void>;
  createCabinet: (data: Partial<Cabinet>) => Promise<Cabinet | null>;
  updateCabinet: (id: number, data: Partial<Cabinet>) => Promise<Cabinet | null>;
  deleteCabinet: (id: number) => Promise<boolean>;

  // ── 档案盒 CRUD ──
  fetchBoxes: (cabinetId: number) => Promise<void>;
  createBox: (cabinetId: number, data: Partial<Box>) => Promise<Box | null>;
  deleteBox: (cabinetId: number, boxId: number) => Promise<boolean>;

  // ── 统计 ──
  fetchStats: () => Promise<void>;

  // ── UI 辅助 ──
  selectCabinet: (id: number | null) => void;
}

// ─── Store 实现 ─────────────────────────────────────

export const useStorageStore = create<StorageStore>((set, get) => ({
  cabinets: [],
  boxes: [],
  stats: null,
  loading: false,
  selectedCabinetId: null,

  // ── 档案柜 CRUD ──

  fetchCabinets: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await apiGet<Cabinet[]>(`${API_PREFIX}/cabinets`, params);
      if (res.code === 0) {
        set({ cabinets: (res.data || []) as Cabinet[] });
      }
    } catch {
      // 静默处理
    } finally {
      set({ loading: false });
    }
  },

  createCabinet: async (data) => {
    try {
      const res = await apiPost<Cabinet>(`${API_PREFIX}/cabinets`, data);
      if (res.code === 0) {
        const { cabinets } = get();
        set({ cabinets: [res.data, ...cabinets] });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  updateCabinet: async (id, data) => {
    try {
      const res = await apiPatch<Cabinet>(`${API_PREFIX}/cabinets/${id}`, data);
      if (res.code === 0) {
        const { cabinets } = get();
        set({ cabinets: cabinets.map((c) => (c.id === id ? res.data : c)) });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  deleteCabinet: async (id) => {
    try {
      const res = await apiDelete(`${API_PREFIX}/cabinets/${id}`);
      if (res.code === 0) {
        const { cabinets, boxes, selectedCabinetId } = get();
        set({
          cabinets: cabinets.filter((c) => c.id !== id),
          boxes: selectedCabinetId === id ? [] : boxes,
          selectedCabinetId: selectedCabinetId === id ? null : selectedCabinetId,
        });
        return true;
      }
    } catch {
      // 静默处理
    }
    return false;
  },

  // ── 档案盒 CRUD ──

  fetchBoxes: async (cabinetId) => {
    set({ loading: true });
    try {
      const res = await apiGet<Box[]>(`${API_PREFIX}/cabinets/${cabinetId}/boxes`);
      if (res.code === 0) {
        set({ boxes: (res.data || []) as Box[] });
      }
    } catch {
      // 静默处理
    } finally {
      set({ loading: false });
    }
  },

  createBox: async (cabinetId, data) => {
    try {
      const res = await apiPost<Box>(`${API_PREFIX}/cabinets/${cabinetId}/boxes`, data);
      if (res.code === 0) {
        const { boxes } = get();
        set({ boxes: [res.data, ...boxes] });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  deleteBox: async (cabinetId, boxId) => {
    try {
      const res = await apiDelete(`${API_PREFIX}/cabinets/${cabinetId}/boxes/${boxId}`);
      if (res.code === 0) {
        const { boxes } = get();
        set({ boxes: boxes.filter((b) => b.id !== boxId) });
        return true;
      }
    } catch {
      // 静默处理
    }
    return false;
  },

  // ── 统计 ──

  fetchStats: async () => {
    try {
      const res = await apiGet<StorageStats>(`${API_PREFIX}/stats`);
      if (res.code === 0) {
        set({ stats: res.data });
      }
    } catch {
      // 静默处理
    }
  },

  // ── UI 辅助 ──

  selectCabinet: (id) => {
    set({ selectedCabinetId: id, boxes: [] });
  },
}));
