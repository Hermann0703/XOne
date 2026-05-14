"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Eye, Pencil, Trash2, Archive as ArchiveIcon, BookOpen, BookCheck, Trash } from 'lucide-react'
import { useArchiveStore, type Archive } from './store'
import { apiGet } from '@/lib/api/client'
import { useRouter } from 'next/navigation'

const PAGE_SIZE = 15

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' }> = {
  archived: { label: '已归档', variant: 'success' },
  borrowed: { label: '已借出', variant: 'warning' },
  destroyed: { label: '已销毁', variant: 'destructive' },
  active: { label: '在库', variant: 'default' },
}

// ─── 查找表类型（API 动态加载） ──────────────────────────

interface LookupItem {
  id: number
  category: string
  code: string
  name: string
  sort_order: number
}

export default function ArchiveList() {
  const router = useRouter()
  const { archives, paging, loading, dashboard, fetchArchives, fetchDashboard, deleteArchive } = useArchiveStore()
  const [search, setSearch] = useState('')
  const [fondsId, setFondsId] = useState('')
  const [securityLevel, setSecurityLevel] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Archive | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── 查找表（API 动态加载） ──
  const [securityItems, setSecurityItems] = useState<LookupItem[]>([])
  const [retentionItems, setRetentionItems] = useState<LookupItem[]>([])

  useEffect(() => {
    apiGet<LookupItem[]>('/work/lookup/security_level/active')
      .then((res) => {
        if (res.code === 0 && Array.isArray(res.data)) setSecurityItems(res.data)
      })
      .catch((err) => console.error('获取密级查找表失败:', err))
  }, [])

  useEffect(() => {
    apiGet<LookupItem[]>('/work/lookup/retention_period/active')
      .then((res) => {
        if (res.code === 0 && Array.isArray(res.data)) setRetentionItems(res.data)
      })
      .catch((err) => console.error('获取保管期限查找表失败:', err))
  }, [])

  // 派生映射 — code → name
  const securityMap = useMemo<Record<string, string>>(
    () => Object.fromEntries(securityItems.map((item) => [item.code, item.name])),
    [securityItems],
  )
  const retentionMap = useMemo<Record<string, string>>(
    () => Object.fromEntries(retentionItems.map((item) => [item.code, item.name])),
    [retentionItems],
  )

  const load = useCallback(() => {
    fetchArchives({ page, size: PAGE_SIZE, search, fonds_id: fondsId, security_level: securityLevel, status })
  }, [page, search, fondsId, securityLevel, status, fetchArchives])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  function handleSearch() {
    setPage(1)
    load()
  }

  function handleDelete(id: number, title: string) {
    setDeleteTarget({ id, title } as Archive);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteArchive(deleteTarget.id);
    setDeleting(false);
    if (ok) {
      setDeleteTarget(null);
      load();
    }
  }

  function statusBadge(s: string | undefined) {
    const m = STATUS_MAP[s ?? 'active'] ?? { label: s ?? '未知', variant: 'outline' as const }
    return <Badge variant={m.variant}>{m.label}</Badge>
  }

  const totalPages = paging ? Math.ceil(paging.total / PAGE_SIZE) : 0

  return (
    <div className="space-y-6 p-6">
      {/* 仪表盘 */}
      {loading && !dashboard ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-card" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">档案总数</CardTitle>
              <ArchiveIcon className="size-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.total ?? '--'}</div>
              <p className="text-xs text-text-secondary">份</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">已归档</CardTitle>
              <BookCheck className="size-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.archived ?? '--'}</div>
              <p className="text-xs text-text-secondary">份</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">已借出</CardTitle>
              <BookOpen className="size-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.borrowed ?? '--'}</div>
              <p className="text-xs text-text-secondary">份</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">已销毁</CardTitle>
              <Trash className="size-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.destroyed ?? '--'}</div>
              <p className="text-xs text-text-secondary">份</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 搜索筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 size-4 text-text-secondary" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索档号、题名、关键词..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Select
          value={fondsId}
          onChange={(e) => { setFondsId(e.target.value); setPage(1) }}
          options={[
            { value: '', label: '全部全宗' },
            { value: '1', label: '全宗一' },
            { value: '2', label: '全宗二' },
          ]}
          placeholder="全宗"
        />
        <Select
          value={securityLevel}
          onChange={(e) => { setSecurityLevel(e.target.value); setPage(1) }}
          options={[
            { value: '', label: '全部密级' },
            ...securityItems.map((item) => ({ value: item.code, label: item.name })),
          ]}
          placeholder="密级"
        />
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          options={[
            { value: '', label: '全部状态' },
            { value: 'active', label: '在库' },
            { value: 'archived', label: '已归档' },
            { value: 'borrowed', label: '已借出' },
            { value: 'destroyed', label: '已销毁' },
          ]}
          placeholder="状态"
        />
        <Button onClick={handleSearch} size="sm">
          <Search className="size-4 mr-1" />
          搜索
        </Button>
        <Button onClick={() => router.push('/work/archives/new')} size="sm">
          <Plus className="size-4 mr-1" />
          新建档案
        </Button>
      </div>

      {/* 表格 */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
        </div>
      ) : archives.length > 0 ? (
        <>
          <div className="rounded-card border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>档号</TableHead>
                  <TableHead>题名</TableHead>
                  <TableHead>全宗</TableHead>
                  <TableHead>密级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead className="w-28">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((a: Archive) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.archive_no}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={a.title}>{a.title}</TableCell>
                    <TableCell className="text-sm text-text-secondary">{a.fonds_name || '-'}</TableCell>
                    <TableCell>{a.security_level ? <Badge variant="outline">{securityMap[a.security_level] ?? a.security_level}</Badge> : '-'}</TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-sm text-text-secondary">{a.doc_date ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => router.push(`/work/archives/${a.id}`)} title="查看" aria-label="查看档案">
                          <Eye className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => router.push(`/work/archives/${a.id}/edit`)} title="编辑" aria-label="编辑档案">
                          <Pencil className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(a.id, a.title)} title="删除" aria-label="删除档案">
                          <Trash2 className="size-3 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页器 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">共 {paging?.total ?? 0} 条记录</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                <span className="text-sm">{page} / {totalPages}</span>
                <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
          暂无档案数据
        </div>
      )}

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除档案「{deleteTarget?.title}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
