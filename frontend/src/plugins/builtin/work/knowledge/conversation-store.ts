// 知识库对话 Zustand Store
// 管理对话列表、当前对话消息、RAG 问答

import { create } from 'zustand'
import { apiGet, apiPost, apiPatch, axiosClient } from '@/lib/api/client'

// ─── 类型定义 ───────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  user_id: string
  created_at: string
  updated_at: string
}

export interface ChatResponse {
  answer: string
  citations?: string[]
}

interface ConversationListResponse {
  items: Conversation[]
  total: number
  page: number
  page_size: number
}

// ─── API 基础路径 ───────────────────────────────────

const BASE = '/work/knowledge'

// ─── 独立的发送消息函数 ─────────────────────────────

export async function sendChatMessage(
  question: string,
  history?: Message[],
): Promise<ChatResponse> {
  const res = await apiPost<ChatResponse>(`${BASE}/chat`, {
    question,
    history: history || [],
  })
  return res.data
}

// ─── Store 接口 ─────────────────────────────────────

interface ConversationStore {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  chatLoading: boolean
  sidebarOpen: boolean

  fetchConversations: () => Promise<void>
  createConversation: (title: string, messages?: Message[]) => Promise<Conversation | null>
  updateConversation: (id: string, title?: string, messages?: Message[]) => Promise<void>
  loadConversation: (id: string) => Promise<void>
  sendMessage: (question: string) => Promise<void>
  setActiveConversation: (conversation: Conversation | null) => void
  setSidebarOpen: (open: boolean) => void
  clearMessages: () => void
}

// ─── Store 实现 ─────────────────────────────────────

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  chatLoading: false,
  sidebarOpen: false,

  fetchConversations: async () => {
    try {
      const res = await apiGet<ConversationListResponse>(`${BASE}/conversations`, {
        page: 1,
        page_size: 50,
      })
      if (res.code === 0 || res.code === 200) {
        set({ conversations: res.data.items || [] })
      }
    } catch {
      // 静默处理
    }
  },

  createConversation: async (title, messages) => {
    try {
      const res = await apiPost<Conversation>(`${BASE}/conversations`, {
        title,
        messages: messages || [],
      })
      if (res.code === 0 || res.code === 200) {
        const conv = res.data
        set((state) => ({
          conversations: [conv, ...state.conversations],
          activeConversation: conv,
          messages: conv.messages || [],
        }))
        return conv
      }
    } catch {
      // 静默处理
    }
    return null
  },

  updateConversation: async (id, title, messages) => {
    const body: Record<string, unknown> = {}
    if (title !== undefined) body.title = title
    if (messages !== undefined) body.messages = messages

    try {
      const res = await apiPatch<Conversation>(`${BASE}/conversations/${id}`, body)
      if (res.code === 0 || res.code === 200) {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...res.data } : c,
          ),
          activeConversation:
            state.activeConversation?.id === id
              ? { ...state.activeConversation, ...res.data }
              : state.activeConversation,
        }))
      }
    } catch {
      // 静默处理
    }
  },

  loadConversation: async (id) => {
    try {
      const res = await apiGet<Conversation>(`${BASE}/conversations/${id}`)
      if (res.code === 0 || res.code === 200) {
        const conv = res.data
        set({
          activeConversation: conv,
          messages: conv.messages || [],
        })
        // 同时更新列表中的该对话
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? conv : c,
          ),
        }))
      }
    } catch {
      // 静默处理
    }
  },

  sendMessage: async (question) => {
    const { messages, activeConversation } = get()
    if (!question.trim()) return

    const userMsg: Message = { role: 'user', content: question.trim() }
    const updatedMessages = [...messages, userMsg]
    set({ messages: updatedMessages, chatLoading: true })

    try {
      const result = await sendChatMessage(question.trim(), messages)
      const assistantMsg: Message = {
        role: 'assistant',
        content: result.answer,
      }
      const finalMessages = [...updatedMessages, assistantMsg]
      set({ messages: finalMessages })

      // 自动保存到后端
      if (activeConversation) {
        const firstUserMsg = messages.length === 0
        const autoTitle =
          activeConversation.title === '新的对话' || activeConversation.title === 'New conversation'
            ? question.trim().slice(0, 30) + (question.trim().length > 30 ? '...' : '')
            : undefined

        await get().updateConversation(
          activeConversation.id,
          autoTitle,
          finalMessages,
        )

        // 刷新侧边栏列表标题
        if (autoTitle) {
          set((state) => ({
            activeConversation: state.activeConversation
              ? { ...state.activeConversation, title: autoTitle, messages: finalMessages }
              : null,
            conversations: state.conversations.map((c) =>
              c.id === activeConversation.id
                ? { ...c, title: autoTitle, messages: finalMessages, updated_at: new Date().toISOString() }
                : c,
            ),
          }))
        } else {
          // 即使标题不变也更新 updated_at
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === activeConversation.id
                ? { ...c, updated_at: new Date().toISOString() }
                : c,
            ),
          }))
        }
      }
    } catch {
      // 静默处理 — 消息已通过乐观更新显示
    } finally {
      set({ chatLoading: false })
    }
  },

  setActiveConversation: (conversation) => {
    set({
      activeConversation: conversation,
      messages: conversation?.messages || [],
    })
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  clearMessages: () =>
    set({ messages: [], activeConversation: null }),
}))
