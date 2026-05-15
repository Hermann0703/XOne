"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Search, BookOpen, AlertTriangle, RotateCcw, Calendar } from 'lucide-react'
import { useArchiveStore, type Borrow } from './store'

const PAGE_SIZE = 15

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' }> = {
  borrowed: { label: '借阅中', variant: 'secondary' },
  returned: { label: '已归还', variant: 'success' },
  overdue: { label: '逾期', variant: 'destructive' },
}

export default function BorrowList() {
  const { borrows, paging, loading, fetchBorrows, returnBorrow, updateBorrow } = useArchiveStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // 归还 Dialog
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnTarget, setReturnTarget] = useState<Borrow | null>(null)
  const [actualReturnDate, setActualReturnDate] = useState('')

  // 续借 Dialog
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewTarget, setRenewTarget] = useState<Borrow | null>(null)
  const [newExpectedDate, setNewExpectedDate] = useState('')

  const load = useCallback(() => {
    fetchBorrows({ page, size: PAGE_SIZE, search })
  }, [page, search, fetchBorrows])

  useEffect(() => { load() }, [load])

  function handleSearch() {
    setPage(1)
    load()
  }

  // 统计
  const totalBorrows = paging?.total ?? borrows.length
  const overdueCount = borrows.filter((b) => b.status === 'overdue').length

  function statusBadge(status: string) {
    const m = STATUS_MAP[status] ?? { label: status, variant: 'outline' as const }
    return <Badge variant={m.variant}>{m.label}</Badge>
  }

  function openReturn(b: Borrow) {
    setReturnTarget(b)
    setActualReturnDate(new Date().toISOString().slice(0, 10))
    setReturnOpen(true)
  }

  async function handleReturn() {
    if (!returnTarget) return
    const ok = await returnBorrow(returnTarget.id)
    if (ok) {
      // 如果有实际归还日期，更新
      if (actualReturnDate) {
        await updateBorrow(returnTarget.id, { actual_return_date: actualReturnDate })
      }
      load()
    }
    setReturnOpen(false)
    setReturnTarget(null)
  }

  function openRenew(b: Borrow) {
    setRenewTarget(b)
    setNewExpectedDate(b.expected_return_date ?? '')
    setRenewOpen(true)
  }

  async function handleRenew() {
    if (!renewTarget) return
    const ok = await updateBorrow(renewTarget.id, { expected_return_date: newExpectedDate })
    if (ok) load()
    setRenewOpen(false)
    setRenewTarget(null)
  }

  const totalPages = paging ? Math.ceil(paging.total / PAGE_SIZE) : 0

  return (
    <div className="space-y-6 p-6">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">借出总数</CardTitle>
            <BookOpen className="size-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBorrows}</div>
            <p className="text-xs text-text-secondary">条借阅记录</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 dark:border-destructive/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive dark:text-destructive">逾期未还</CardTitle>
            <AlertTriangle className="size-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
            <p className="text-xs text-destructive">条逾期记录</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 size-4 text-text-secondary" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索借阅人..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} size="sm">
          <Search className="size-4 mr-1" />
          搜索
        </Button>
      </div>

      {/* 表格 */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
        </div>
      ) : borrows.length > 0 ? (
        <>
          <div className="rounded-card border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>借阅人</TableHead>
                  <TableHead>档案题名</TableHead>
                  <TableHead>借阅日期</TableHead>
                  <TableHead>预计归还</TableHead>
                  <TableHead>实际归还</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-36">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrows.map((b: Borrow) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.borrower}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={b.archive_title}>{b.archive_title ?? '-'}</TableCell>
                    <TableCell className="text-sm">{b.borrow_date ?? '-'}</TableCell>
                    <TableCell className="text-sm">{b.expected_return_date ?? '-'}</TableCell>
                    <TableCell className="text-sm">{b.actual_return_date ?? '-'}</TableCell>
                    <TableCell>{statusBadge(b.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {b.status !== 'returned' && (
                          <>
                            <Button variant="outline" size="xs" onClick={() => openReturn(b)}>
                              归还
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => openRenew(b)}>
                              续借
                            </Button>
                          </>
                        )}
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
          暂无借阅记录
        </div>
      )}

      {/* 归还 Dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent onClose={() => setReturnOpen(false)}>
          <DialogHeader>
            <DialogTitle>归还档案</DialogTitle>
          </DialogHeader>
        </DialogContent>
        <DialogBody>
          <p className="text-sm text-text-secondary mb-4">
            确认归还档案「{returnTarget?.archive_title ?? '-'}」？借阅人：{returnTarget?.borrower ?? '-'}
          </p>
          <div>
            <label className="text-sm font-medium">实际归还日期</label>
            <Input
              type="date"
              value={actualReturnDate}
              onChange={(e) => setActualReturnDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setReturnOpen(false)}>取消</Button>
          <Button onClick={handleReturn}>
            <RotateCcw className="size-4 mr-1" />
            确认归还
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 续借 Dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent onClose={() => setRenewOpen(false)}>
          <DialogHeader>
            <DialogTitle>续借档案</DialogTitle>
          </DialogHeader>
        </DialogContent>
        <DialogBody>
          <p className="text-sm text-text-secondary mb-4">
            修改「{renewTarget?.archive_title ?? '-'}」的预计归还日期
          </p>
          <div>
            <label className="text-sm font-medium">预计归还日期</label>
            <Input
              type="date"
              value={newExpectedDate}
              onChange={(e) => setNewExpectedDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRenewOpen(false)}>取消</Button>
          <Button onClick={handleRenew}>
            <Calendar className="size-4 mr-1" />
            确认续借
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
