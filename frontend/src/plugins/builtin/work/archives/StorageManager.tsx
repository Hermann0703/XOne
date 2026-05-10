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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, Box, Archive, MapPin, Layers, Save, Pencil, X } from 'lucide-react'
import { useArchiveStore, type Cabinet, type Box as BoxType, type Archive as ArchiveType } from './store'

const BOX_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' }> = {
  empty: { label: '空', variant: 'secondary' },
  partial: { label: '部分', variant: 'default' },
  full: { label: '满', variant: 'success' },
}

const SECURITY_LABEL: Record<string, string> = {
  public: '公开',
  internal: '内部',
  secret: '秘密',
  confidential: '机密',
}

export default function StorageManager() {
  const {
    cabinets, boxes, loading,
    fetchCabinets, fetchBoxes, createCabinet, updateCabinet, deleteCabinet,
    createBox, updateBox, deleteBox, fetchBoxArchives,
  } = useArchiveStore()

  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet | null>(null)
  const [boxArchives, setBoxArchives] = useState<ArchiveType[]>([])
  const [loadingArchives, setLoadingArchives] = useState(false)

  // 新建档案柜 Dialog
  const [cabinetOpen, setCabinetOpen] = useState(false)
  const [editingCabinet, setEditingCabinet] = useState<Cabinet | null>(null)
  const [cabinetForm, setCabinetForm] = useState({ name: '', code: '', floor: '', room: '', description: '' })
  const [savingCabinet, setSavingCabinet] = useState(false)

  // 新建档案盒 Dialog
  const [boxOpen, setBoxOpen] = useState(false)
  const [editingBox, setEditingBox] = useState<BoxType | null>(null)
  const [boxForm, setBoxForm] = useState({ box_no: '', row: '1', col: '1', layer: '1', status: 'empty', description: '' })
  const [savingBox, setSavingBox] = useState(false)

  // 盒内档案 Dialog
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [selectedBox, setSelectedBox] = useState<BoxType | null>(null)

  // 初始加载
  useEffect(() => { fetchCabinets() }, [fetchCabinets])

  // 选中档案柜时加载其档案盒
  const handleSelectCabinet = useCallback((cabinet: Cabinet) => {
    setSelectedCabinet(cabinet)
    fetchBoxes(cabinet.id)
  }, [fetchBoxes])

  // 点击档案盒查看盒内档案
  async function handleBoxClick(box: BoxType) {
    setSelectedBox(box)
    setArchiveOpen(true)
    setLoadingArchives(true)
    const archives = await fetchBoxArchives(box.id)
    setBoxArchives(archives)
    setLoadingArchives(false)
  }

  // --- 档案柜 CRUD ---
  function openCreateCabinet() {
    setEditingCabinet(null)
    setCabinetForm({ name: '', code: '', floor: '', room: '', description: '' })
    setCabinetOpen(true)
  }

  function openEditCabinet(cabinet: Cabinet) {
    setEditingCabinet(cabinet)
    setCabinetForm({
      name: cabinet.name ?? '',
      code: cabinet.code ?? '',
      floor: cabinet.floor ?? '',
      room: cabinet.room ?? '',
      description: cabinet.description ?? '',
    })
    setCabinetOpen(true)
  }

  async function handleSaveCabinet(e: React.FormEvent) {
    e.preventDefault()
    if (!cabinetForm.name.trim() || !cabinetForm.code.trim()) return

    setSavingCabinet(true)
    const payload = {
      name: cabinetForm.name.trim(),
      code: cabinetForm.code.trim(),
      floor: cabinetForm.floor.trim() || undefined,
      room: cabinetForm.room.trim() || undefined,
      description: cabinetForm.description.trim() || undefined,
    }

    let result: Cabinet | null = null
    if (editingCabinet) {
      result = await updateCabinet(editingCabinet.id, payload)
    } else {
      result = await createCabinet(payload)
    }
    setSavingCabinet(false)

    if (result) {
      setCabinetOpen(false)
      fetchCabinets()
      if (result.id === selectedCabinet?.id) {
        setSelectedCabinet(result)
      }
    }
  }

  async function handleDeleteCabinet(id: number, name: string) {
    if (!window.confirm(`确认删除档案柜「${name}」？删除后其中的档案盒也会受到影响。`)) return
    const ok = await deleteCabinet(id)
    if (ok) {
      if (selectedCabinet?.id === id) setSelectedCabinet(null)
      fetchCabinets()
    }
  }

  // --- 档案盒 CRUD ---
  function openCreateBox() {
    if (!selectedCabinet) return
    setEditingBox(null)
    setBoxForm({ box_no: '', row: '1', col: '1', layer: '1', status: 'empty', description: '' })
    setBoxOpen(true)
  }

  function openEditBox(box: BoxType) {
    setEditingBox(box)
    setBoxForm({
      box_no: box.box_no ?? '',
      row: box.row ? String(box.row) : '1',
      col: box.col ? String(box.col) : '1',
      layer: box.layer ? String(box.layer) : '1',
      status: box.status ?? 'empty',
      description: box.description ?? '',
    })
    setBoxOpen(true)
  }

  async function handleSaveBox(e: React.FormEvent) {
    e.preventDefault()
    if (!boxForm.box_no.trim() || !selectedCabinet) return

    setSavingBox(true)
    const payload = {
      cabinet_id: selectedCabinet.id,
      box_no: boxForm.box_no.trim(),
      row: Number(boxForm.row) || 1,
      col: Number(boxForm.col) || 1,
      layer: Number(boxForm.layer) || 1,
      status: boxForm.status,
      description: boxForm.description.trim() || undefined,
    }

    let result: BoxType | null = null
    if (editingBox) {
      result = await updateBox(editingBox.id, payload)
    } else {
      result = await createBox(payload)
    }
    setSavingBox(false)

    if (result) {
      setBoxOpen(false)
      fetchBoxes(selectedCabinet.id)
    }
  }

  async function handleDeleteBox(id: number, boxNo: string) {
    if (!window.confirm(`确认删除档案盒「${boxNo}」？`)) return
    const ok = await deleteBox(id)
    if (ok && selectedCabinet) {
      fetchBoxes(selectedCabinet.id)
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">库房管理</h2>
        <div className="flex items-center gap-2">
          {selectedCabinet && (
            <Button size="sm" onClick={openCreateBox}>
              <Plus className="size-4 mr-1" />
              新建档案盒
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={openCreateCabinet}>
            <Plus className="size-4 mr-1" />
            新建档案柜
          </Button>
        </div>
      </div>

      {/* 左右布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* 左侧：档案柜列表 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Box className="size-4" />
              档案柜列表
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px] px-4 pb-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 rounded-card" />)}
                </div>
              ) : cabinets.length > 0 ? (
                <div className="space-y-2">
                  {cabinets.map((cab: Cabinet) => (
                    <Card
                      key={cab.id}
                      className={`cursor-pointer transition-colors hover:border-primary/50 ${
                        selectedCabinet?.id === cab.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border'
                      }`}
                      onClick={() => handleSelectCabinet(cab)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{cab.name}</p>
                            {cab.floor && (
                              <p className="text-xs text-text-secondary flex items-center gap-1">
                                <MapPin className="size-3" />
                                {cab.floor}
                              </p>
                            )}
                            <p className="text-xs text-text-secondary flex items-center gap-1">
                              <Layers className="size-3" />
                              {cab.room || '-'}
                              {cab.box_count !== undefined && (
                                <span className="ml-1"> · {cab.box_count} 盒</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => { e.stopPropagation(); openEditCabinet(cab) }}
                              title="编辑"
                              aria-label="编辑档案柜"
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => { e.stopPropagation(); handleDeleteCabinet(cab.id, cab.name) }}
                              title="删除"
                              aria-label="删除档案柜"
                            >
                              <Trash2 className="size-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
                  暂无档案柜，请新建
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 右侧：档案盒网格 */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Archive className="size-4" />
              {selectedCabinet ? (
                <>
                  档案盒 — {selectedCabinet.name}
                  <span className="text-sm font-normal text-text-secondary ml-2">
                    (共 {boxes.length} 盒)
                  </span>
                </>
              ) : (
                <span className="text-text-secondary font-normal text-sm">请选择左侧档案柜</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCabinet ? (
              <div className="flex items-center justify-center h-[500px] text-text-secondary text-sm">
                ← 请在左侧选择一个档案柜查看其档案盒
              </div>
            ) : loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-card" />
                ))}
              </div>
            ) : boxes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {boxes.map((box: BoxType) => {
                  const statusInfo = BOX_STATUS_MAP[box.status] ?? { label: box.status, variant: 'outline' as const }
                  return (
                    <Card
                      key={box.id}
                      className="cursor-pointer transition-colors hover:border-primary/50 hover:shadow-sm"
                      onClick={() => handleBoxClick(box)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium font-mono truncate">{box.box_no}</span>
                          <Badge variant={statusInfo.variant} className="text-xs shrink-0">
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-text-secondary space-y-0.5">
                          <p>行 {box.row} · 列 {box.col} · 层 {box.layer}</p>
                          {box.archive_count !== undefined && (
                            <p>存放档案: {box.archive_count} 份</p>
                          )}
                          {box.description && (
                            <p className="truncate" title={box.description}>描述: {box.description}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-0.5 mt-2">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => { e.stopPropagation(); openEditBox(box) }}
                            title="编辑"
                            aria-label="编辑档案盒"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => { e.stopPropagation(); handleDeleteBox(box.id, box.box_no) }}
                            title="删除"
                            aria-label="删除档案盒"
                          >
                            <Trash2 className="size-3 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[500px] text-text-secondary text-sm flex-col gap-2">
                <Archive className="size-8 text-text-secondary/30" />
                <span>该档案柜暂无档案盒</span>
                <Button size="sm" variant="outline" onClick={openCreateBox}>
                  <Plus className="size-3 mr-1" />
                  新建档案盒
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 档案柜 Dialog */}
      <Dialog open={cabinetOpen} onOpenChange={setCabinetOpen}>
        <DialogContent onClose={() => setCabinetOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editingCabinet ? '编辑档案柜' : '新建档案柜'}</DialogTitle>
          </DialogHeader>
        </DialogContent>
        <form onSubmit={handleSaveCabinet}>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">名称 <span className="text-red-500">*</span></label>
                <Input
                  value={cabinetForm.name}
                  onChange={(e) => setCabinetForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="如：A区主柜"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">编号 <span className="text-red-500">*</span></label>
                <Input
                  value={cabinetForm.code}
                  onChange={(e) => setCabinetForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="如：CAB-001"
                  required
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">楼层</label>
              <Input
                value={cabinetForm.floor}
                onChange={(e) => setCabinetForm((prev) => ({ ...prev, floor: e.target.value }))}
                placeholder="如：3楼"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">房间</label>
              <Input
                value={cabinetForm.room}
                onChange={(e) => setCabinetForm((prev) => ({ ...prev, room: e.target.value }))}
                placeholder="如：档案室A"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={cabinetForm.description}
                onChange={(e) => setCabinetForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="档案柜描述信息"
                rows={2}
                className="mt-1"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setCabinetOpen(false)}>取消</Button>
            <Button type="submit" disabled={!cabinetForm.name.trim() || !cabinetForm.code.trim() || savingCabinet}>
              <Save className="size-4 mr-1" />
              {savingCabinet ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* 档案盒 Dialog */}
      <Dialog open={boxOpen} onOpenChange={setBoxOpen}>
        <DialogContent onClose={() => setBoxOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editingBox ? '编辑档案盒' : '新建档案盒'}</DialogTitle>
          </DialogHeader>
        </DialogContent>
        <form onSubmit={handleSaveBox}>
          <DialogBody className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                盒编号 <span className="text-red-500">*</span>
              </label>
              <Input
                value={boxForm.box_no}
                onChange={(e) => setBoxForm((prev) => ({ ...prev, box_no: e.target.value }))}
                placeholder="如：BOX-2025-001"
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">行</label>
                <Input
                  type="number"
                  min={1}
                  value={boxForm.row}
                  onChange={(e) => setBoxForm((prev) => ({ ...prev, row: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">列</label>
                <Input
                  type="number"
                  min={1}
                  value={boxForm.col}
                  onChange={(e) => setBoxForm((prev) => ({ ...prev, col: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">层</label>
                <Input
                  type="number"
                  min={1}
                  value={boxForm.layer}
                  onChange={(e) => setBoxForm((prev) => ({ ...prev, layer: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">状态</label>
              <Select
                value={boxForm.status}
                onChange={(e) => setBoxForm((prev) => ({ ...prev, status: e.target.value }))}
                options={[
                  { value: 'empty', label: '空' },
                  { value: 'partial', label: '部分占用' },
                  { value: 'full', label: '满载' },
                ]}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Input
                value={boxForm.description}
                onChange={(e) => setBoxForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="描述信息"
                className="mt-1"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setBoxOpen(false)}>取消</Button>
            <Button type="submit" disabled={!boxForm.box_no.trim() || savingBox}>
              <Save className="size-4 mr-1" />
              {savingBox ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* 盒内档案 Dialog */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent onClose={() => setArchiveOpen(false)}>
          <DialogHeader>
            <DialogTitle>盒内档案 — {selectedBox?.box_no ?? ''}</DialogTitle>
          </DialogHeader>
        </DialogContent>
        <DialogBody>
          {loadingArchives ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded" />)}
            </div>
          ) : boxArchives.length > 0 ? (
            <div className="border border-border rounded overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>档号</TableHead>
                    <TableHead>题名</TableHead>
                    <TableHead>密级</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boxArchives.map((a: ArchiveType) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.archive_no}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={a.title}>{a.title}</TableCell>
                      <TableCell>
                        {a.security_level ? (
                          <Badge variant="outline" className="text-xs">
                            {SECURITY_LABEL[a.security_level] ?? a.security_level}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
              该档案盒暂无档案
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setArchiveOpen(false)}>关闭</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
