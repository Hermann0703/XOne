// 知识库对话 Zustand Store
// 管理对话列表、当前对话消息、RAG 问答

import { create } from 'zustand'
import { apiGet, apiPost, apiPatch, axiosClient } from '@/lib/api/client'

// ─── 类型定义 ───────────────────────────────────────

export interface Source {
  doc_id: string
  title: string
  snippet: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
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

// ─── 流式 SSE 发送消息 ────────────────────────────

export async function sendChatMessageStream(
  question: string,
  history: Message[],
  onToken: (token: string) => void,
  onDone: (sources: Source[]) => void,
  onError: (err: string) => void,
): Promise<void> {
  const baseURL = axiosClient.defaults.baseURL || ''
  const url = `${baseURL}${BASE}/chat/stream`
  const authHeader = axiosClient.defaults.headers.common['Authorization']

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: String(authHeader) } : {}),
      },
      body: JSON.stringify({ question, history }),
    })

    if (!res.ok) {
      onError(`HTTP ${res.status}`)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      onError('No response body')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const dataStr = line.slice(6).trim()
        if (dataStr === '[DONE]') continue

        try {
          const chunk = JSON.parse(dataStr)
          if (chunk.type === 'answer') {
            onToken(chunk.content)
          } else if (chunk.type === 'done') {
            onDone(chunk.sources || [])
          } else if (chunk.type === 'error') {
            onError(chunk.message || 'Unknown error')
          }
        } catch {
          // skip unparsable lines
        }
      }
    }
  } catch (err: any) {
    onError(err.message || 'Network error')
  }
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

    // 预留一个空的 assistant 消息位，用于流式填充
    const assistantMsg: Message = { role: 'assistant', content: '' }
    const pendingMessages = [...updatedMessages, assistantMsg]
    set({ messages: pendingMessages })

    let finalContent = ''
    let finalSources: Source[] = []

    try {
      await sendChatMessageStream(
        question.trim(),
        messages,
        (token) => {
          finalContent += token
          set({
            messages: [
              ...updatedMessages,
              { role: 'assistant', content: finalContent } as Message,
            ],
          })
        },
        (sources) => {
          finalSources = sources
        },
        (err) => {
          set({
            messages: [
              ...updatedMessages,
              { role: 'assistant', content: `Error: ${err}` },
            ],
          })
        },
      )

      // 流式结束后合成最终消息（含 sources）
      const finalMsg: Message = {
        role: 'assistant',
        content: finalContent || '(empty response)',
        ...(finalSources.length > 0 ? { sources: finalSources } : {}),
      }
      const finalMessages = [...updatedMessages, finalMsg]
      set({ messages: finalMessages })

      // 自动保存到后端
      if (activeConversation) {
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
      // 静默处理 — SSE 内部已通过 onError 回调更新 UI
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
