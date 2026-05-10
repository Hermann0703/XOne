'use client'

import { useTranslations } from 'next-intl'
import { X, MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useConversationStore, type Conversation } from './conversation-store'

// ─── 相对时间格式化 ─────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
}

// ─── 对话列表项 ─────────────────────────────────────

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 rounded-lg transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-foreground',
      )}
    >
      <div className="flex items-center gap-2.5">
        <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {conversation.title || '未命名对话'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {conversation.updated_at
              ? formatRelativeTime(conversation.updated_at)
              : ''}
          </p>
        </div>
      </div>
    </button>
  )
}

// ─── 主组件 ─────────────────────────────────────────

export default function ConversationList() {
  const t = useTranslations()
  const {
    conversations,
    activeConversation,
    sidebarOpen,
    setSidebarOpen,
    setActiveConversation,
  } = useConversationStore()

  if (!sidebarOpen) return null

  return (
    <aside
      className={cn(
        'w-72 shrink-0 border-r border-border bg-card flex flex-col',
        'h-[calc(100vh-180px)]',
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          {t('knowledge.conversations')}
        </h3>
        <Button
            variant="ghost"
            size="icon"
            aria-label="关闭侧边栏"
            onClick={() => setSidebarOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* 列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('knowledge.noConversations')}
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversation?.id === conv.id}
                onClick={() => setActiveConversation(conv)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
