'use client'

import { useState } from 'react'
import { apiPost } from '@/lib/api/client'
import { useTranslations } from 'next-intl'
import {
  Search,
  RefreshCw,
  FileText,
  Package,
  BookOpen,
  Activity,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ─── 常量 ──────────────────────────────────────────────

interface SearchResult {
  id: string
  title: string
  snippet: string
  type: 'contract' | 'archive' | 'knowledge' | 'dispatch'
  updated_at: string
}

interface SearchResponse {
  results: SearchResult[]
  total: number
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  contract: FileText,
  archive: Package,
  knowledge: BookOpen,
  dispatch: Activity,
}

const TYPE_BADGE_CLASSES: Record<string, string> = {
  contract:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  archive:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  knowledge:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  dispatch:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

const TAB_OPTIONS = [
  { value: 'all', icon: Search },
  { value: 'contract', icon: FileText },
  { value: 'archive', icon: Package },
  { value: 'knowledge', icon: BookOpen },
  { value: 'dispatch', icon: Activity },
]

// ─── 主组件 ──────────────────────────────────────────

export default function SearchDashboard() {
  const t = useTranslations()

  // 搜索状态
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // 重建索引弹窗
  const [reindexDialogOpen, setReindexDialogOpen] = useState(false)
  const [reindexing, setReindexing] = useState(false)

  // ─── API 调用 ──────────────────────────────

  const performSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const data = await apiPost<SearchResponse>('/work/search/global', {
        query: trimmed,
        limit: 20,
      })
      if (data.code === 0 || data.code === 200) {
        setResults(data.data.results || [])
        setTotal(data.data.total || 0)
      } else {
        setResults([])
        setTotal(0)
      }
    } catch (err) {
      console.error('Search failed:', err)
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handleReindex = async () => {
    setReindexing(true)
    try {
      const data = await apiPost<any>('/work/search/reindex', {})
      console.log('Reindex response:', data)
    } catch (err) {
      console.error('Reindex failed:', err)
    } finally {
      setReindexing(false)
      setReindexDialogOpen(false)
    }
  }

  // ─── 派生数据 ──────────────────────────────

  const filteredResults =
    activeTab === 'all'
      ? results
      : results.filter((r) => r.type === activeTab)

  const hasSearched = query.trim() !== ''

  // ─── 渲染 ──────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
              <Input
                placeholder={t('search.placeholder')}
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') performSearch()
                }}
              />
            </div>
            <Button onClick={performSearch} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Search className="size-4 mr-1" />
              )}
              {t('search.search')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 类型过滤 Tabs — 始终可见 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Icon className="size-4 mr-1.5" />
                {t(`search.tabs.${tab.value}`)}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {/* 加载中骨架 */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* 初始引导 — 尚未搜索 */}
      {!loading && !hasSearched && (
        <Card>
          <CardContent className="text-center py-16">
            <Search className="size-12 mx-auto text-text-secondary/40 mb-4" />
            <p className="text-base text-text-secondary">
              {t('search.initialPrompt')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 搜索结果 */}
      {!loading && filteredResults.length > 0 && (
        <>
          <p className="text-sm text-text-secondary">
            {t('search.resultCount', { count: filteredResults.length })}
            {total > filteredResults.length &&
              ` (${t('search.total')} ${total})`}
          </p>
          <div className="space-y-3">
            {filteredResults.map((result) => {
              const Icon = TYPE_ICONS[result.type] || FileText
              return (
                <Card key={result.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge
                            className={TYPE_BADGE_CLASSES[result.type]}
                          >
                            {t(`search.types.${result.type}`)}
                          </Badge>
                          <h3 className="font-semibold text-text-primary truncate">
                            {result.title}
                          </h3>
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-2 mt-1">
                          {result.snippet}
                        </p>
                        <p className="text-xs text-text-secondary mt-2">
                          {result.updated_at}
                        </p>
                      </div>
                      <Icon className="size-5 text-text-secondary shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* 无结果 */}
      {!loading && hasSearched && results.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center py-10 text-text-secondary">
            {t('search.noResults')}
          </CardContent>
        </Card>
      )}

      {/* 重建索引按钮 */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => setReindexDialogOpen(true)}
        >
          <RefreshCw className="size-4 mr-1" />
          {t('search.reindex')}
        </Button>
      </div>

      {/* 重建索引确认弹窗 */}
      <Dialog
        open={reindexDialogOpen}
        onOpenChange={(open) => {
          if (!open) setReindexDialogOpen(false)
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('search.reindexDialogTitle')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-text-secondary">
            {t('search.reindexDialogDesc')}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setReindexDialogOpen(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleReindex} disabled={reindexing}>
            {reindexing
              ? t('search.reindexing')
              : t('common.confirm')}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
