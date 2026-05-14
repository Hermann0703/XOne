'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogBody,
} from '@/components/ui/dialog'
import {
  useLifecycleStore,
  type LifecycleTemplate,
  type LifecycleStage,
} from './lifecycleStore'
import { apiGet } from '@/lib/api/client'

// ─── 阶段类型数据 ────────────────────────────────────

interface StageType {
  id: number
  name: string
  code: string
  color: string
  default_status: string
  sort_order: number
}

// ─── 模板表单数据 ────────────────────────────────────

interface TemplateFormData {
  name: string
  description: string
}

const emptyTemplateForm: TemplateFormData = { name: '', description: '' }

// ─── 阶段表单数据 ────────────────────────────────────

interface StageFormData {
  name: string
  stage_type: string
  color: string
  is_required: boolean
  auto_transition_days: number
  description: string
}

const emptyStageForm: StageFormData = {
  name: '',
  stage_type: 'drafting',
  color: '#3b82f6',
  is_required: true,
  auto_transition_days: 0,
  description: '',
}

// ─── 主组件 ──────────────────────────────────────────

export default function ContractLifecycleManager() {
  const t = useTranslations()
  const {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
  } = useLifecycleStore()

  // ── 阶段类型（API 动态加载） ──
  const [stageTypes, setStageTypes] = useState<StageType[]>([])
  const [stageTypesLoading, setStageTypesLoading] = useState(true)

  useEffect(() => {
    apiGet<StageType[]>('/work/contracts/stage-types/active')
      .then((res) => {
        if (res.code === 0 && Array.isArray(res.data)) {
          setStageTypes(res.data)
        }
      })
      .catch((err) => console.error('获取阶段类型失败:', err))
      .finally(() => setStageTypesLoading(false))
  }, [])

  // 派生映射 — 从 API 数据构建 code→label / code→color / options
  const stageTypeLabels = useMemo<Record<string, string>>(
    () => Object.fromEntries(stageTypes.map((t) => [t.code, t.name])),
    [stageTypes],
  )
  const stageTypeColors = useMemo<Record<string, string>>(
    () => Object.fromEntries(stageTypes.map((t) => [t.code, t.color])),
    [stageTypes],
  )
  const stageTypeOptions = useMemo(
    () => stageTypes.map((t) => ({ value: t.code, label: t.name })),
    [stageTypes],
  )

  // 展开/折叠的模板 ID 集合
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // ── 模板对话框 ──
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateForm, setTemplateForm] = useState<TemplateFormData>(emptyTemplateForm)
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)
  const [templateSubmitting, setTemplateSubmitting] = useState(false)

  // ── 阶段对话框 ──
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [stageForm, setStageForm] = useState<StageFormData>(emptyStageForm)
  const [editingStage, setEditingStage] = useState<{ templateId: number; stageId: number } | null>(null)
  const [stageTargetTemplateId, setStageTargetTemplateId] = useState<number | null>(null)
  const [stageSubmitting, setStageSubmitting] = useState(false)

  // ── 删除确认 ──
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<LifecycleTemplate | null>(null)
  const [deleteStageTarget, setDeleteStageTarget] = useState<{
    templateId: number
    stage: LifecycleStage
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── 加载 ──

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // ── 折叠切换 ──

  const toggleExpand = useCallback((templateId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return next
    })
  }, [])

  // ── 模板对话框 ──

  const openCreateTemplateDialog = () => {
    setEditingTemplateId(null)
    setTemplateForm(emptyTemplateForm)
    setTemplateDialogOpen(true)
  }

  const openEditTemplateDialog = (tmpl: LifecycleTemplate) => {
    setEditingTemplateId(tmpl.id)
    setTemplateForm({ name: tmpl.name, description: tmpl.description || '' })
    setTemplateDialogOpen(true)
  }

  const handleTemplateSubmit = async () => {
    if (!templateForm.name.trim()) return
    setTemplateSubmitting(true)
    if (editingTemplateId) {
      await updateTemplate(editingTemplateId, templateForm)
    } else {
      await createTemplate(templateForm)
    }
    setTemplateSubmitting(false)
    setTemplateDialogOpen(false)
    setTemplateForm(emptyTemplateForm)
    setEditingTemplateId(null)
  }

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateTarget) return
    setDeleting(true)
    const ok = await deleteTemplate(deleteTemplateTarget.id)
    setDeleting(false)
    if (ok) setDeleteTemplateTarget(null)
  }

  // ── 阶段对话框 ──

  const openAddStageDialog = (templateId: number) => {
    setStageTargetTemplateId(templateId)
    setEditingStage(null)
    setStageForm(emptyStageForm)
    setStageDialogOpen(true)
  }

  const openEditStageDialog = (
    templateId: number,
    stage: LifecycleStage,
  ) => {
    setStageTargetTemplateId(templateId)
    setEditingStage({ templateId, stageId: stage.id })
    setStageForm({
      name: stage.name,
      stage_type: stage.stage_type,
      color: stage.color || '#6b7280',
      is_required: stage.is_required,
      auto_transition_days: stage.auto_transition_days,
      description: stage.description || '',
    })
    setStageDialogOpen(true)
  }

  const handleStageSubmit = async () => {
    if (!stageForm.name.trim() || !stageTargetTemplateId) return
    setStageSubmitting(true)
    if (editingStage) {
      await updateStage(stageTargetTemplateId, editingStage.stageId, stageForm)
    } else {
      await addStage(stageTargetTemplateId, stageForm)
    }
    setStageSubmitting(false)
    setStageDialogOpen(false)
    setStageForm(emptyStageForm)
    setEditingStage(null)
    setStageTargetTemplateId(null)
  }

  const handleDeleteStage = async () => {
    if (!deleteStageTarget) return
    setDeleting(true)
    const ok = await deleteStage(
      deleteStageTarget.templateId,
      deleteStageTarget.stage.id,
    )
    setDeleting(false)
    if (ok) setDeleteStageTarget(null)
  }

  // 阶段类型变化时自动设置默认颜色
  const handleStageTypeChange = (value: string) => {
    setStageForm((prev) => ({
      ...prev,
      stage_type: value,
      color: stageTypeColors[value] || '#6b7280',
    }))
  }

  // ── 渲染 ──

  return (
    <div className="space-y-6 p-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {t('contracts.lifecycle.description') || '管理合同生命周期模板，定义各阶段的流转规则'}
        </p>
        <Button onClick={openCreateTemplateDialog}>
          <Plus className="size-4 mr-1" />
          新建模板
        </Button>
      </div>

      {/* 模板卡片列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-card" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                  <GitBranch className="w-7 h-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    暂无生命周期模板
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    点击「新建模板」按钮创建第一个生命周期模板
                  </p>
                </div>
                <Button onClick={openCreateTemplateDialog} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  新建模板
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          templates.map((tmpl) => {
            const isExpanded = expandedIds.has(tmpl.id)
            const stageCount = tmpl.stages?.length || 0
            return (
              <Card key={tmpl.id}>
                {/* 模板头部 */}
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleExpand(tmpl.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="size-5" />
                        ) : (
                          <ChevronRight className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate">{tmpl.name}</CardTitle>
                        {tmpl.description && (
                          <CardDescription className="mt-1 line-clamp-1">
                            {tmpl.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="outline">
                        {stageCount} 个阶段
                      </Badge>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0 ml-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="编辑模板"
                        aria-label="编辑模板"
                        onClick={() => openEditTemplateDialog(tmpl)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="删除模板"
                        aria-label="删除模板"
                        onClick={() => setDeleteTemplateTarget(tmpl)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* 阶段列表（折叠时隐藏） */}
                {isExpanded && (
                  <CardContent>
                    <div className="space-y-2">
                      {stageCount === 0 ? (
                        <p className="text-sm text-text-secondary py-4 text-center">
                          暂无阶段，点击下方按钮添加
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {tmpl.stages
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((stage) => (
                              <div
                                key={stage.id}
                                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
                              >
                                {/* 拖拽手柄 */}
                                <GripVertical className="size-4 text-muted-foreground shrink-0 cursor-grab opacity-40 group-hover:opacity-100" />

                                {/* 阶段名称 */}
                                <span className="flex-1 text-sm font-medium truncate">
                                  {stage.name}
                                </span>

                                {/* 阶段类型 Badge */}
                                <Badge
                                  variant="outline"
                                  style={{
                                    borderColor: stage.color || stageTypeColors[stage.stage_type],
                                    color: stage.color || stageTypeColors[stage.stage_type],
                                  }}
                                >
                                  {stageTypeLabels[stage.stage_type] || stage.stage_type}
                                </Badge>

                                {/* 必填标记 */}
                                {stage.is_required && (
                                  <span className="text-xs text-red-500 font-medium shrink-0">
                                    必填
                                  </span>
                                )}

                                {/* 自动流转天数 */}
                                {stage.auto_transition_days > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                    <Clock className="size-3" />
                                    {stage.auto_transition_days}天
                                  </span>
                                )}

                                {/* 操作按钮 */}
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    title="编辑阶段"
                                    aria-label="编辑阶段"
                                    onClick={() =>
                                      openEditStageDialog(tmpl.id, stage)
                                    }
                                  >
                                    <Pencil className="size-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    title="删除阶段"
                                    aria-label="删除阶段"
                                    onClick={() =>
                                      setDeleteStageTarget({
                                        templateId: tmpl.id,
                                        stage,
                                      })
                                    }
                                  >
                                    <Trash2 className="size-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* 添加阶段按钮 */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => openAddStageDialog(tmpl.id)}
                      >
                        <Plus className="size-3.5 mr-1" />
                        添加阶段
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* ═══ 模板编辑对话框 ═══ */}
      <Dialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTemplateDialogOpen(false)
            setTemplateForm(emptyTemplateForm)
            setEditingTemplateId(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplateId ? '编辑模板' : '新建模板'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplateId
                ? '修改生命周期模板的基本信息'
                : '创建一个新的合同生命周期模板'}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              模板名称 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="例如：标准采购合同流程"
              value={templateForm.name}
              onChange={(e) =>
                setTemplateForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              描述
            </label>
            <Input
              placeholder="模板用途说明（可选）"
              value={templateForm.description}
              onChange={(e) =>
                setTemplateForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setTemplateDialogOpen(false)
              setTemplateForm(emptyTemplateForm)
              setEditingTemplateId(null)
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleTemplateSubmit}
            disabled={!templateForm.name.trim() || templateSubmitting}
          >
            {templateSubmitting ? '保存中...' : editingTemplateId ? '保存修改' : '创建模板'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ═══ 阶段编辑对话框 ═══ */}
      <Dialog
        open={stageDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setStageDialogOpen(false)
            setStageForm(emptyStageForm)
            setEditingStage(null)
            setStageTargetTemplateId(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStage ? '编辑阶段' : '添加阶段'}
            </DialogTitle>
            <DialogDescription>
              {editingStage
                ? '修改生命周期阶段信息'
                : '为模板添加一个新的生命周期阶段'}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
        <DialogBody className="space-y-4">
          {/* 阶段名称 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              阶段名称 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="例如：合同起草"
              value={stageForm.name}
              onChange={(e) =>
                setStageForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          {/* 阶段类型 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              阶段类型
            </label>
            <Select
              options={stageTypeOptions}
              value={stageForm.stage_type}
              onChange={(e) => handleStageTypeChange(e.target.value)}
            />
          </div>

          {/* 阶段颜色 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              阶段颜色
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={stageForm.color}
                onChange={(e) =>
                  setStageForm((prev) => ({ ...prev, color: e.target.value }))
                }
                className="w-10 h-10 rounded border border-border cursor-pointer shrink-0"
              />
              <Input
                placeholder="#3b82f6"
                value={stageForm.color}
                onChange={(e) =>
                  setStageForm((prev) => ({ ...prev, color: e.target.value }))
                }
                className="flex-1"
              />
            </div>
          </div>

          {/* 是否必填 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">
              必填阶段
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={stageForm.is_required}
              onClick={() =>
                setStageForm((prev) => ({
                  ...prev,
                  is_required: !prev.is_required,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                stageForm.is_required
                  ? 'bg-primary'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  stageForm.is_required ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 自动流转天数 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              自动流转天数
            </label>
            <Input
              type="number"
              min={0}
              placeholder="0 表示不自动流转"
              value={stageForm.auto_transition_days}
              onChange={(e) =>
                setStageForm((prev) => ({
                  ...prev,
                  auto_transition_days: parseInt(e.target.value) || 0,
                }))
              }
            />
            <p className="text-xs text-text-secondary">
              到达指定天数后自动流转到下一阶段，设为 0 则不自动流转
            </p>
          </div>

          {/* 阶段描述 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              阶段描述
            </label>
            <Input
              placeholder="阶段说明（可选）"
              value={stageForm.description}
              onChange={(e) =>
                setStageForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setStageDialogOpen(false)
              setStageForm(emptyStageForm)
              setEditingStage(null)
              setStageTargetTemplateId(null)
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleStageSubmit}
            disabled={!stageForm.name.trim() || stageSubmitting}
          >
            {stageSubmitting ? '保存中...' : editingStage ? '保存修改' : '添加阶段'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ═══ 删除模板确认弹窗 ═══ */}
      <Dialog
        open={!!deleteTemplateTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTemplateTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除模板「{deleteTemplateTarget?.name}」吗？该模板下的所有阶段也将被删除，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTemplateTarget(null)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteTemplate}
            disabled={deleting}
          >
            {deleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ═══ 删除阶段确认弹窗 ═══ */}
      <Dialog
        open={!!deleteStageTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteStageTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除阶段「{deleteStageTarget?.stage.name}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteStageTarget(null)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteStage}
            disabled={deleting}
          >
            {deleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
