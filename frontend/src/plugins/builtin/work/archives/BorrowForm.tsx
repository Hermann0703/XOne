"use client"

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Save } from 'lucide-react'
import { useArchiveStore, type Archive } from './store'

interface BorrowFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  /** 可选：预先指定档案 */
  preSelectedArchiveId?: number
}

export default function BorrowForm({ open, onOpenChange, onSuccess, preSelectedArchiveId }: BorrowFormProps) {
  const { archives, fetchArchives, createBorrow } = useArchiveStore()

  const [archiveId, setArchiveId] = useState(preSelectedArchiveId ? String(preSelectedArchiveId) : '')
  const [archiveSearch, setArchiveSearch] = useState('')
  const [borrower, setBorrower] = useState('')
  const [purpose, setPurpose] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [saving, setSaving] = useState(false)

  // 加载档案列表用于下拉选择
  useEffect(() => {
    fetchArchives({ size: 200, status: 'active' })
  }, [fetchArchives])

  useEffect(() => {
    if (preSelectedArchiveId) {
      setArchiveId(String(preSelectedArchiveId))
    }
  }, [preSelectedArchiveId])

  // 根据搜索过滤档案
  const filteredArchives = archiveSearch
    ? archives.filter((a: Archive) =>
        a.title?.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        a.archive_no?.toLowerCase().includes(archiveSearch.toLowerCase())
      )
    : archives.slice(0, 50)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!archiveId || !borrower.trim()) return

    setSaving(true)
    const result = await createBorrow({
      archive_id: Number(archiveId),
      borrower: borrower.trim(),
      purpose: purpose.trim() || undefined,
      expected_return_date: expectedReturnDate || undefined,
    })
    setSaving(false)

    if (result) {
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    }
  }

  function resetForm() {
    setArchiveId(preSelectedArchiveId ? String(preSelectedArchiveId) : '')
    setArchiveSearch('')
    setBorrower('')
    setPurpose('')
    setExpectedReturnDate('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>借阅登记</DialogTitle>
        </DialogHeader>
      </DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          {/* 选择档案 */}
          <div>
            <label className="text-sm font-medium">
              选择档案 <span className="text-red-500">*</span>
            </label>
            {!preSelectedArchiveId && (
              <Input
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder="输入档号或题名搜索..."
                className="mb-2 mt-1"
              />
            )}
            <Select
              value={archiveId}
              onChange={(e) => setArchiveId(e.target.value)}
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

          {/* 借阅人 */}
          <div>
            <label className="text-sm font-medium">
              借阅人 <span className="text-red-500">*</span>
            </label>
            <Input
              value={borrower}
              onChange={(e) => setBorrower(e.target.value)}
              placeholder="请输入借阅人姓名"
              required
              className="mt-1"
            />
          </div>

          {/* 借阅目的 */}
          <div>
            <label className="text-sm font-medium">借阅目的</label>
            <Textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="请简要说明借阅目的"
              rows={2}
              className="mt-1"
            />
          </div>

          {/* 预计归还日期 */}
          <div>
            <label className="text-sm font-medium">预计归还日期</label>
            <Input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" disabled={!archiveId || !borrower.trim() || saving}>
            <Save className="size-4 mr-1" />
            {saving ? '提交中...' : '提交登记'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
