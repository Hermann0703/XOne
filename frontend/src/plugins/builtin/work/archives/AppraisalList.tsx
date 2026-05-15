"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Plus, Eye, Trash2, Save } from 'lucide-react'
import { useArchiveStore, type Appraisal, type Archive } from './store'

const PAGE_SIZE = 15

const TYPE_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' }> = {
  expiration: { label: '到期鉴定', variant: 'warning' },
  destruction: { label: '销毁鉴定', variant: 'destructive' },
  value: { label: '价值鉴定', variant: 'default' },
  other: { label: '其他', variant: 'secondary' },
}

export default function AppraisalList() {
  const { appraisals, archives, paging, loading, fetchAppraisals, fetchArchives, createAppraisal, deleteAppraisal } = useArchiveStore()
  const [page, setPage] = useState(1)

  // 新建鉴定 Dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [archiveSearch, setArchiveSearch] = useState('')
  const [form, setForm] = useState({
    archive_id: '',
    appraisal_type: '',
    result: '',
    appraiser: '',
    remark: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    fetchAppraisals({ page, size: PAGE_SIZE })
  }, [page, fetchAppraisals])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetchArchives({ size: 200 }) }, [fetchArchives])

  function typeBadge(t: string) {
    const m = TYPE_MAP[t] ?? { label: t || '未知', variant: 'outline' as const }
    return <Badge variant={m.variant}>{m.label}</Badge>
  }

  function openCreate() {
    setForm({ archive_id: '', appraisal_type: '', result: '', appraiser: '', remark: '' })
    setArchiveSearch('')
    setCreateOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.archive_id || !form.appraisal_type || !form.result.trim()) return

    setSaving(true)
    const result = await createAppraisal({
      archive_id: Number(form.archive_id),
      appraisal_type: form.appraisal_type,
      result: form.result.trim(),
      appraiser: form.appraiser.trim() || undefined,
      remark: form.remark.trim() || undefined,
      appraisal_date: new Date().toISOString().slice(0, 10),
    })
    setSaving(false)

    if (result) {
      setCreateOpen(false)
      load()
    }
  }

  async function handleDelete(id: number, title: string) {
    if (!window.confirm(`确认删除鉴定记录「${title}」？`)) return
    const ok = await deleteAppraisal(id)
    if (ok) load()
  }

  const filteredArchives = archiveSearch
    ? archives.filter((a: Archive) =>
        a.title?.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        a.archive_no?.toLowerCase().includes(archiveSearch.toLowerCase())
      )
    : archives.slice(0, 50)

  const totalPages = paging ? Math.ceil(paging.total / PAGE_SIZE) : 0

  return (
    <div className="space-y-6 p-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">鉴定记录</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          新建鉴定
        </Button>
      </div>

      {/* 表格 */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
        </div>
      ) : appraisals.length > 0 ? (
        <>
          <div className="rounded-card border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>档案题名</TableHead>
                  <TableHead>鉴定类型</TableHead>
                  <TableHead>鉴定日期</TableHead>
                  <TableHead>鉴定结果</TableHead>
                  <TableHead>鉴定人</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appraisals.map((a: Appraisal) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium max-w-[180px] truncate" title={a.archive_title}>
                      {a.archive_title ?? '-'}
                    </TableCell>
                    <TableCell>{typeBadge(a.appraisal_type)}</TableCell>
                    <TableCell className="text-sm">{a.appraisal_date ?? '-'}</TableCell>
                    <TableCell className="text-sm font-medium">{a.result}</TableCell>
                    <TableCell className="text-sm text-text-secondary">{a.appraiser ?? '-'}</TableCell>
                    <TableCell className="text-sm text-text-secondary max-w-[150px] truncate" title={a.remark}>
                      {a.remark ?? '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" title="查看" aria-label="查看鉴定记录">
                          <Eye className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(a.id, a.archive_title ?? `#${a.id}`)} title="删除" aria-label="删除鉴定记录">
                          <Trash2 className="size-3 text-destructive" />
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
          暂无鉴定记录
        </div>
      )}

      {/* 新建鉴定 Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent onClose={() => setCreateOpen(false)}>
          <DialogHeader>
            <DialogTitle>新建鉴定</DialogTitle>
          </DialogHeader>
        </DialogContent>
        <form onSubmit={handleCreate}>
          <DialogBody className="space-y-4">
            {/* 选择档案 */}
            <div>
              <label className="text-sm font-medium">
                选择档案 <span className="text-destructive">*</span>
              </label>
              <Input
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder="输入档号或题名搜索..."
                className="mb-2 mt-1"
              />
              <Select
                value={form.archive_id}
                onChange={(e) => setForm((prev) => ({ ...prev, archive_id: e.target.value }))}
                placeholder="请选择档案"
                options={[
                  { value: '', label: '请选择档案' },
                  ...filteredArchives.map((a: Archive) => ({
                    value: String(a.id),
                    label: `${a.archive_no} — ${a.title}`,
                  })),
                ]}
                required
              />
            </div>

            {/* 鉴定类型 */}
            <div>
              <label className="text-sm font-medium">
                鉴定类型 <span className="text-destructive">*</span>
              </label>
              <Select
                value={form.appraisal_type}
                onChange={(e) => setForm((prev) => ({ ...prev, appraisal_type: e.target.value }))}
                placeholder="选择鉴定类型"
                options={[
                  { value: '', label: '请选择' },
                  { value: 'expiration', label: '到期鉴定' },
                  { value: 'destruction', label: '销毁鉴定' },
                  { value: 'value', label: '价值鉴定' },
                  { value: 'other', label: '其他' },
                ]}
                required
                className="mt-1"
              />
            </div>

            {/* 鉴定结果 */}
            <div>
              <label className="text-sm font-medium">
                鉴定结果 <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.result}
                onChange={(e) => setForm((prev) => ({ ...prev, result: e.target.value }))}
                placeholder="如：继续保存、销毁、降密..."
                required
                className="mt-1"
              />
            </div>

            {/* 鉴定人 */}
            <div>
              <label className="text-sm font-medium">鉴定人</label>
              <Input
                value={form.appraiser}
                onChange={(e) => setForm((prev) => ({ ...prev, appraiser: e.target.value }))}
                placeholder="鉴定人姓名"
                className="mt-1"
              />
            </div>

            {/* 备注 */}
            <div>
              <label className="text-sm font-medium">备注</label>
              <Textarea
                value={form.remark}
                onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                placeholder="鉴定备注信息"
                rows={2}
                className="mt-1"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={!form.archive_id || !form.appraisal_type || !form.result.trim() || saving}>
              <Save className="size-4 mr-1" />
              {saving ? '提交中...' : '提交'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
