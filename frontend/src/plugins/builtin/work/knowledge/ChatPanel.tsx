'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Send,
  MessageSquarePlus,
  PanelLeft,
  Loader2,
  Sparkles,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useConversationStore, type Message, type Source } from './conversation-store'
import ConversationList from './ConversationList'

// ─── 加载状态指示器 ─────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="flex gap-1">
        <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
        <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
        <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-foreground ml-1">AI 思考中...</span>
    </div>
  )
}

// ─── 消息气泡 ───────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[75%] px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
            : 'bg-muted text-foreground rounded-2xl rounded-bl-md',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* 来源引用卡片 */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="max-w-[75%] mt-2 space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            引用来源
          </p>
          {message.sources.map((src, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs"
            >
              <p className="font-medium text-foreground">{src.title}</p>
              <p className="text-muted-foreground mt-0.5 line-clamp-2">
                {src.snippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 新建对话对话框 ─────────────────────────────

function NewConversationDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (title: string) => void
  loading: boolean
}) {
  const t = useTranslations()
  const [title, setTitle] = useState('')

  const handleConfirm = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onConfirm(trimmed)
    setTitle('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleConfirm()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) setTitle('')
        onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('knowledge.newConversation')}</DialogTitle>
          <DialogDescription>
            {t('knowledge.newConversationDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t('knowledge.conversationTitle')}
            </label>
            <Input
              placeholder={t('knowledge.conversationTitlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!title.trim() || loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── 主面板 ─────────────────────────────────────────

export default function ChatPanel() {
  const t = useTranslations()
  const {
    messages,
    chatLoading,
    activeConversation,
    sidebarOpen,
    sendMessage,
    createConversation,
    setSidebarOpen,
    setActiveConversation,
    clearMessages,
    fetchConversations,
  } = useConversationStore()

  const [input, setInput] = useState('')
  const [newConvOpen, setNewConvOpen] = useState(false)
  const [creatingConv, setCreatingConv] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 初始加载对话列表
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, chatLoading])

  // 发送消息
  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || chatLoading) return

    setInput('')

    // 如果没有活跃对话，自动创建
    if (!activeConversation) {
      setCreatingConv(true)
      const autoTitle = trimmed.slice(0, 30) + (trimmed.length > 30 ? '...' : '')
      const conv = await createConversation(autoTitle)
      setCreatingConv(false)
      if (!conv) return

      // 创建成功后，使用新对话发送
      setTimeout(() => {
        const store = useConversationStore.getState()
        if (store.activeConversation) {
          store.sendMessage(trimmed)
        }
      }, 50)
      return
    }

    await sendMessage(trimmed)
    inputRef.current?.focus()
  }, [input, chatLoading, activeConversation, sendMessage, createConversation])

  // 新建对话
  const handleNewConversation = async (title: string) => {
    setCreatingConv(true)
    await createConversation(title)
    setCreatingConv(false)
    setNewConvOpen(false)
    inputRef.current?.focus()
  }

  // 键盘处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-180px)]">
      {/* 侧边栏 */}
      <ConversationList />

      {/* 聊天主区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={t('knowledge.toggleSidebar')}
            >
              <PanelLeft className="size-4" />
            </Button>
            <h3 className="text-sm font-semibold text-foreground truncate">
              {activeConversation
                ? activeConversation.title
                : t('knowledge.chat')}
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewConvOpen(true)}
            className="shrink-0"
          >
            <MessageSquarePlus className="size-4 mr-1.5" />
            {t('knowledge.newConversation')}
          </Button>
        </div>

        {/* 消息区域 */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="px-4 py-4 space-y-4">
            {messages.length === 0 && !chatLoading ? (
              /* 空状态 */
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Sparkles className="size-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">{t('knowledge.chatEmpty')}</p>
                <p className="text-sm mt-1">{t('knowledge.chatEmptyHint')}</p>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble key={i} message={msg} />
                ))}
                {chatLoading && <TypingIndicator />}
              </>
            )}
          </div>
        </ScrollArea>

        {/* 输入框 */}
        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <Textarea
              ref={inputRef}
              placeholder={t('knowledge.chatPlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading || creatingConv}
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              autoFocus
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || chatLoading || creatingConv}
              size="icon"
              className="size-10 shrink-0"
            >
              {chatLoading || creatingConv ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 text-center max-w-3xl mx-auto">
            {t('knowledge.chatHint')}
          </p>
        </div>
      </div>

      {/* 新建对话对话框 */}
      <NewConversationDialog
        open={newConvOpen}
        onOpenChange={setNewConvOpen}
        onConfirm={handleNewConversation}
        loading={creatingConv}
      />
    </div>
  )
}
