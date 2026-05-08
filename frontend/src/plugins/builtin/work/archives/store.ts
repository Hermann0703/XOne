// 档案管理 Zustand Store
// 管理档案、借阅、鉴定、库房的状态与异步操作

import { create } from 'zustand'

const API_BASE = 'http://localhost:8000/api/v1/work'

/* ---------- 类型 ---------- */
export interface Archive {
  id: number
  archive_no: string
  title: string
  fonds_id?: number
  fonds_name?: string
  category_id?: number
  category_name?: string
  security_level?: string
  file_no?: string
  volume_no?: string
  responsible_person?: string
  doc_date?: string
  page_count?: number
  retention_period?: string
  location?: string
  description?: string
  keywords?: string
  status?: string
  box_id?: number
  box_no?: string
  created_at?: string
  updated_at?: string
}

export interface FileRecord {
  id: number
  archive_id: number
  filename: string
  original_name?: string
  file_size?: number
  file_type?: string
  created_at?: string
}

export interface Borrow {
  id: number
  archive_id: number
  archive_title?: string
  archive_no?: string
  borrower: string
  borrow_date: string
  expected_return_date: string
  actual_return_date?: string
  purpose?: string
  status: string
  created_at?: string
}

export interface Appraisal {
  id: number
  archive_id: number
  archive_title?: string
  archive_no?: string
  appraisal_type: string
  appraisal_date: string
  result: string
  appraiser?: string
  remark?: string
  created_at?: string
}

export interface Cabinet {
  id: number
  name: string
  code: string
  floor?: string
  room?: string
  description?: string
  box_count?: number
  created_at?: string
}

export interface Box {
  id: number
  cabinet_id: number
  cabinet_name?: string
  box_no: string
  row: number
  col: number
  layer: number
  status: string
  archive_count?: number
  description?: string
  created_at?: string
}

export interface Dashboard {
  total: number
  archived: number
  borrowed: number
  destroyed: number
}

export interface Paging {
  total: number
  page: number
  size: number
}

/* ---------- State ---------- */
interface ArchiveState {
  archives: Archive[]
  borrows: Borrow[]
  appraisals: Appraisal[]
  cabinets: Cabinet[]
  boxes: Box[]
  selectedArchive: Archive | null
  dashboard: Dashboard | null
  paging: Paging | null
  loading: boolean

  // Archives
  fetchArchives: (params?: Record<string, string | number>) => Promise<void>
  createArchive: (data: Partial<Archive>) => Promise<Archive | null>
  updateArchive: (id: number, data: Partial<Archive>) => Promise<Archive | null>
  deleteArchive: (id: number) => Promise<boolean>
  fetchDashboard: () => Promise<void>
  selectArchive: (archive: Archive | null) => void

  // Files
  fetchFiles: (archiveId: number) => Promise<FileRecord[]>
  uploadFile: (archiveId: number, file: File) => Promise<boolean>
  deleteFile: (fileId: number) => Promise<boolean>

  // Borrows
  fetchBorrows: (params?: Record<string, string | number>) => Promise<void>
  createBorrow: (data: Partial<Borrow>) => Promise<Borrow | null>
  updateBorrow: (id: number, data: Partial<Borrow>) => Promise<Borrow | null>
  returnBorrow: (id: number, force?: boolean) => Promise<boolean>
  deleteBorrow: (id: number) => Promise<boolean>

  // Appraisals
  fetchAppraisals: (params?: Record<string, string | number>) => Promise<void>
  createAppraisal: (data: Partial<Appraisal>) => Promise<Appraisal | null>
  updateAppraisal: (id: number, data: Partial<Appraisal>) => Promise<Appraisal | null>
  deleteAppraisal: (id: number) => Promise<boolean>

  // Cabinets
  fetchCabinets: () => Promise<void>
  createCabinet: (data: Partial<Cabinet>) => Promise<Cabinet | null>
  updateCabinet: (id: number, data: Partial<Cabinet>) => Promise<Cabinet | null>
  deleteCabinet: (id: number) => Promise<boolean>

  // Boxes
  fetchBoxes: (cabinetId: number) => Promise<void>
  createBox: (data: Partial<Box>) => Promise<Box | null>
  updateBox: (id: number, data: Partial<Box>) => Promise<Box | null>
  deleteBox: (id: number) => Promise<boolean>
  fetchBoxArchives: (boxId: number) => Promise<Archive[]>
}

/* ---------- 辅助 ---------- */
async function req<T>(url: string, options?: RequestInit): Promise<{ data: T; paging?: Paging } | null> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const json = await res.json()
    if (json.code !== undefined && json.code !== 0 && json.code !== 200) {
      console.warn('[ArchiveStore] API 错误:', json.message ?? json.code)
      return null
    }
    return { data: json.data, paging: json.paging }
  } catch (e) {
    console.error('[ArchiveStore] 请求失败:', e)
    return null
  }
}

/* ---------- Store ---------- */
export const useArchiveStore = create<ArchiveState>((set, get) => ({
  archives: [],
  borrows: [],
  appraisals: [],
  cabinets: [],
  boxes: [],
  selectedArchive: null,
  dashboard: null,
  paging: null,
  loading: false,

  /* --- Archives --- */
  fetchArchives: async (params = {}) => {
    set({ loading: true })
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)) })
    const result = await req<Archive[]>(`/archives?${qs.toString()}`)
    if (result) {
      set({ archives: result.data ?? [], paging: result.paging ?? null, loading: false })
    } else {
      set({ loading: false })
    }
  },

  createArchive: async (data) => {
    const result = await req<Archive>('/archives', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return result?.data ?? null
  },

  updateArchive: async (id, data) => {
    const result = await req<Archive>(`/archives/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return result?.data ?? null
  },

  deleteArchive: async (id) => {
    const result = await req<null>(`/archives/${id}`, { method: 'DELETE' })
    return result !== null
  },

  fetchDashboard: async () => {
    const result = await req<Dashboard>('/archives/dashboard')
    if (result) set({ dashboard: result.data })
  },

  selectArchive: (archive) => set({ selectedArchive: archive }),

  /* --- Files --- */
  fetchFiles: async (archiveId) => {
    const result = await req<FileRecord[]>(`/archives/${archiveId}/files`)
    return result?.data ?? []
  },

  uploadFile: async (archiveId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`${API_BASE}/archives/${archiveId}/files`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      return json.code === undefined || json.code === 0 || json.code === 200
    } catch {
      return false
    }
  },

  deleteFile: async (fileId) => {
    const result = await req<null>(`/files/${fileId}`, { method: 'DELETE' })
    return result !== null
  },

  /* --- Borrows --- */
  fetchBorrows: async (params = {}) => {
    set({ loading: true })
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)) })
    const result = await req<Borrow[]>(`/borrows?${qs.toString()}`)
    if (result) {
      set({ borrows: result.data ?? [], paging: result.paging ?? null, loading: false })
    } else {
      set({ loading: false })
    }
  },

  createBorrow: async (data) => {
    const result = await req<Borrow>('/borrows', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return result?.data ?? null
  },

  updateBorrow: async (id, data) => {
    const result = await req<Borrow>(`/borrows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return result?.data ?? null
  },

  returnBorrow: async (id, force = false) => {
    const result = await req<null>(`/borrows/${id}/return`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    })
    return result !== null
  },

  deleteBorrow: async (id) => {
    const result = await req<null>(`/borrows/${id}`, { method: 'DELETE' })
    return result !== null
  },

  /* --- Appraisals --- */
  fetchAppraisals: async (params = {}) => {
    set({ loading: true })
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)) })
    const result = await req<Appraisal[]>(`/appraisals?${qs.toString()}`)
    if (result) {
      set({ appraisals: result.data ?? [], paging: result.paging ?? null, loading: false })
    } else {
      set({ loading: false })
    }
  },

  createAppraisal: async (data) => {
    const result = await req<Appraisal>('/appraisals', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return result?.data ?? null
  },

  updateAppraisal: async (id, data) => {
    const result = await req<Appraisal>(`/appraisals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return result?.data ?? null
  },

  deleteAppraisal: async (id) => {
    const result = await req<null>(`/appraisals/${id}`, { method: 'DELETE' })
    return result !== null
  },

  /* --- Cabinets --- */
  fetchCabinets: async () => {
    const result = await req<Cabinet[]>('/storage/cabinets')
    if (result) set({ cabinets: result.data ?? [] })
  },

  createCabinet: async (data) => {
    const result = await req<Cabinet>('/storage/cabinets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return result?.data ?? null
  },

  updateCabinet: async (id, data) => {
    const result = await req<Cabinet>(`/storage/cabinets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return result?.data ?? null
  },

  deleteCabinet: async (id) => {
    const result = await req<null>(`/storage/cabinets/${id}`, { method: 'DELETE' })
    return result !== null
  },

  /* --- Boxes --- */
  fetchBoxes: async (cabinetId) => {
    const result = await req<Box[]>(`/storage/cabinets/${cabinetId}/boxes`)
    if (result) set({ boxes: result.data ?? [] })
  },

  createBox: async (data) => {
    const result = await req<Box>('/storage/boxes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return result?.data ?? null
  },

  updateBox: async (id, data) => {
    const result = await req<Box>(`/storage/boxes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return result?.data ?? null
  },

  deleteBox: async (id) => {
    const result = await req<null>(`/storage/boxes/${id}`, { method: 'DELETE' })
    return result !== null
  },

  fetchBoxArchives: async (boxId) => {
    const result = await req<Archive[]>(`/storage/boxes/${boxId}/archives`)
    return result?.data ?? []
  },
}))
