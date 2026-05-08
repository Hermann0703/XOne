// 知识库 Zustand Store
// 管理文档、对话、统计与 RAG 问答状态

import { create } from 'zustand';
import { apiGet, apiPost, apiDelete } from '@/lib/api/client';

// ─── 类型定义 ───────────────────────────────────────

export interface KnowledgeDocument {
  id: number;
  title: string;
  file_type: string;         // pdf / docx / txt / md / webpage
  status: string;            // processing / ready / error
  chunk_count: number;
  file_size?: number;
  tags?: string[];
  source_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface KnowledgeStats {
  total_documents: number;
  total_chunks: number;
  total_size: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

export interface KnowledgeConversation {
  id: number;
  title: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: CitationSource[];
  created_at?: string;
}

export interface CitationSource {
  document_id: number;
  document_title: string;
  chunk_index: number;
  content: string;
  score?: number;
}

export interface Paging {
  total: number;
  page: number;
  size: number;
}

// ─── API 基础路径 ───────────────────────────────────

const BASE = '/work/knowledge';

// ─── Store 接口 ─────────────────────────────────────

interface KnowledgeStore {
  // 列表状态
  documents: KnowledgeDocument[];
  paging: Paging | null;
  loading: boolean;

  // 选中
  selectedDoc: KnowledgeDocument | null;

  // 搜索
  searchQuery: string;

  // 统计
  stats: KnowledgeStats | null;

  // 对话
  conversations: KnowledgeConversation[];
  activeConversationId: number | null;
  chatHistory: ChatMessage[];
  chatLoading: boolean;

  // ── 文档操作 ──
  fetchDocuments: (params?: Record<string, unknown>) => Promise<void>;
  uploadDocument: (formData: FormData) => Promise<KnowledgeDocument | null>;
  deleteDocument: (id: number) => Promise<boolean>;
  batchDelete: (ids: number[]) => Promise<boolean>;
  reindexDocument: (id: number) => Promise<boolean>;
  searchDocuments: (query: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  setSelectedDoc: (doc: KnowledgeDocument | null) => void;
  setSearchQuery: (q: string) => void;

  // ── 对话操作 ──
  fetchConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<KnowledgeConversation | null>;
  setActiveConversation: (id: number | null) => void;
  sendMessage: (content: string) => Promise<void>;
  loadChatHistory: (conversationId: number) => Promise<void>;
  clearChat: () => void;
}

// ─── Store 实现 ─────────────────────────────────────

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
  documents: [],
  paging: null,
  loading: false,
  selectedDoc: null,
  searchQuery: '',
  stats: null,
  conversations: [],
  activeConversationId: null,
  chatHistory: [],
  chatLoading: false,

  // ── 文档操作 ──

  fetchDocuments: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await apiGet<KnowledgeDocument[]>(`${BASE}/documents`, params);
      if (res.code === 200 || res.code === 0) {
        set({ documents: res.data, paging: (res as any).paging || null });
      }
    } catch {
      // 静默处理
    } finally {
      set({ loading: false });
    }
  },

  uploadDocument: async (formData) => {
    try {
      // 文件上传使用 fetch 原生（需要 multipart/form-data）
      const token = typeof window !== 'undefined' ? localStorage.getItem('xone-token') : null;
      const res = await fetch(`/api/v1${BASE}/documents`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        const { documents } = get();
        set({ documents: [json.data, ...documents] });
        return json.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  deleteDocument: async (id) => {
    try {
      const res = await apiDelete(`${BASE}/documents/${id}`);
      if (res.code === 200 || res.code === 0) {
        const { documents } = get();
        set({ documents: documents.filter((d) => d.id !== id) });
        return true;
      }
    } catch {
      // 静默处理
    }
    return false;
  },

  batchDelete: async (ids) => {
    try {
      const res = await apiPost(`${BASE}/documents/batch-delete`, { ids });
      if (res.code === 200 || res.code === 0) {
        const { documents } = get();
        set({ documents: documents.filter((d) => !ids.includes(d.id)) });
        return true;
      }
    } catch {
      // 静默处理
    }
    return false;
  },

  reindexDocument: async (id) => {
    try {
      const res = await apiPost(`${BASE}/documents/${id}/reindex`);
      if (res.code === 200 || res.code === 0) {
        const { documents } = get();
        set({
          documents: documents.map((d) =>
            d.id === id ? { ...d, status: 'processing' } : d,
          ),
        });
        return true;
      }
    } catch {
      // 静默处理
    }
    return false;
  },

  searchDocuments: async (query) => {
    set({ searchQuery: query, loading: true });
    try {
      const res = await apiGet<KnowledgeDocument[]>(`${BASE}/documents`, { search: query });
      if (res.code === 200 || res.code === 0) {
        set({ documents: res.data });
      }
    } catch {
      // 静默处理
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const res = await apiGet<KnowledgeStats>(`${BASE}/stats`);
      if (res.code === 200 || res.code === 0) {
        set({ stats: res.data });
      }
    } catch {
      // 静默处理
    }
  },

  setSelectedDoc: (doc) => set({ selectedDoc: doc }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  // ── 对话操作 ──

  fetchConversations: async () => {
    try {
      const res = await apiGet<KnowledgeConversation[]>(`${BASE}/conversations`);
      if (res.code === 200 || res.code === 0) {
        set({ conversations: res.data });
      }
    } catch {
      // 静默处理
    }
  },

  createConversation: async (title) => {
    try {
      const res = await apiPost<KnowledgeConversation>(`${BASE}/conversations`, {
        title: title || '新的对话',
      });
      if (res.code === 200 || res.code === 0) {
        const { conversations } = get();
        set({
          conversations: [res.data, ...conversations],
          activeConversationId: res.data.id,
          chatHistory: [],
        });
        return res.data;
      }
    } catch {
      // 静默处理
    }
    return null;
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id) {
      get().loadChatHistory(id);
    } else {
      set({ chatHistory: [] });
    }
  },

  sendMessage: async (content) => {
    const { activeConversationId, chatHistory } = get();
    if (!activeConversationId || !content.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: content.trim() };
    set({ chatHistory: [...chatHistory, userMsg], chatLoading: true });

    try {
      const res = await apiPost<ChatMessage>(`${BASE}/chat`, {
        conversation_id: activeConversationId,
        message: content.trim(),
      });
      if (res.code === 200 || res.code === 0) {
        const { chatHistory: current } = get();
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: res.data.content,
          sources: res.data.sources,
        };
        set({ chatHistory: [...current, assistantMsg] });
      }
    } catch {
      // 静默处理
    } finally {
      set({ chatLoading: false });
    }
  },

  loadChatHistory: async (conversationId) => {
    try {
      const res = await apiGet<{ messages: ChatMessage[] }>(`${BASE}/conversations/${conversationId}`);
      if (res.code === 200 || res.code === 0) {
        set({ chatHistory: res.data?.messages || [] });
      }
    } catch {
      set({ chatHistory: [] });
    }
  },

  clearChat: () => set({ chatHistory: [], activeConversationId: null }),
}));
