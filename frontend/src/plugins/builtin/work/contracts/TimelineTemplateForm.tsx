"use client";

// 时间轴模板创建/编辑弹窗
// 通过 Dialog 展示，支持新建和编辑两种模式，内嵌节点编辑器

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiPost, apiPatch, apiDelete } from "@/lib/api/client";
import TimelineNodeEditor from "./TimelineNodeEditor";
import type { TimelineNodeDraft } from "./TimelineNodeEditor";
import type { TimelineTemplate, TimelineNode } from "./store";

// ─── 类型定义 ────────────────────────────────────────

export interface TimelineTemplateFormData {
  name: string;
  description: string;
  is_active: boolean;
}

// ─── Props ───────────────────────────────────────────

interface TimelineTemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 编辑模式下传入已有数据（含 nodes） */
  editData?: TimelineTemplate | null;
  /** 创建/更新成功后的回调 */
  onSuccess?: () => void;
}

// ─── 工具函数 ────────────────────────────────────────

function nodesToDrafts(nodes: TimelineNode[]): TimelineNodeDraft[] {
  return nodes.map((n) => ({
    _key: String(n.id),
    id: n.id,
    label: n.label,
    sort_order: n.sort_order,
    icon_type: n.icon_type,
    is_required: n.is_required,
    description: n.description || "",
  }));
}

// ─── 初始值 ──────────────────────────────────────────

const INITIAL_FORM: TimelineTemplateFormData = {
  name: "",
  description: "",
  is_active: true,
};

// ─── 组件 ────────────────────────────────────────────

export default function TimelineTemplateForm({
  open,
  onOpenChange,
  editData,
  onSuccess,
}: TimelineTemplateFormProps) {
  const t = useTranslations();

  const isEdit = !!editData;
  const editId = editData?.id ?? null;

  const [form, setForm] = useState<TimelineTemplateFormData>({ ...INITIAL_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [draftNodes, setDraftNodes] = useState<TimelineNodeDraft[]>([]);

  // ─── 弹窗打开/编辑数据变化时同步表单 ────────────

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          name: editData.name || "",
          description: editData.description || "",
          is_active: editData.is_active ?? true,
        });
        setDraftNodes(
          editData.nodes && editData.nodes.length > 0
            ? nodesToDrafts(editData.nodes)
            : []
        );
      } else {
        setForm({ ...INITIAL_FORM });
        setDraftNodes([]);
      }
      setFormErrors({});
    }
  }, [open, editData]);

  // ─── 校验 ────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "请输入模板名称";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── 节点同步 ────────────────────────────────────

  const syncNodes = useCallback(
    async (templateId: number) => {
      if (!editData?.nodes) {
        // 新建模式：所有节点都是新的，直接 POST
        for (let i = 0; i < draftNodes.length; i++) {
          const node = draftNodes[i];
          await apiPost(`/work/contracts/timeline-templates/${templateId}/nodes`, {
            label: node.label,
            sort_order: i,
            icon_type: node.icon_type,
            is_required: node.is_required,
            description: node.description || undefined,
          });
        }
        return;
      }

      // 编辑模式：diff 处理
      const existingIds = new Set(editData.nodes.map((n) => n.id));
      const draftIds = new Set(
        draftNodes.filter((n) => n.id > 0).map((n) => n.id)
      );

      // 删除后端有但草稿中没有的节点
      for (const en of editData.nodes) {
        if (!draftIds.has(en.id)) {
          await apiDelete(
            `/work/contracts/timeline-templates/${templateId}/nodes/${en.id}`
          );
        }
      }

      // 新增/更新
      for (let i = 0; i < draftNodes.length; i++) {
        const node = draftNodes[i];
        const payload = {
          label: node.label,
          sort_order: i,
          icon_type: node.icon_type,
          is_required: node.is_required,
          description: node.description || undefined,
        };

        if (node.id > 0 && existingIds.has(node.id)) {
          // 更新已有节点
          await apiPatch(
            `/work/contracts/timeline-templates/${templateId}/nodes/${node.id}`,
            payload
          );
        } else {
          // 新建节点
          await apiPost(
            `/work/contracts/timeline-templates/${templateId}/nodes`,
            payload
          );
        }
      }
    },
    [draftNodes, editData]
  );

  // ─── 提交 ────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        is_active: form.is_active,
      };

      if (isEdit && editId) {
        const res = await apiPatch<TimelineTemplate>(
          `/work/contracts/timeline-templates/${editId}`,
          payload
        );
        if (res.code !== 0) {
          toast(res.message || "更新失败");
          return;
        }
        await syncNodes(editId);
        toast("时间轴模板已更新");
      } else {
        const res = await apiPost<TimelineTemplate>(
          "/work/contracts/timeline-templates",
          payload
        );
        if (res.code !== 0) {
          toast(res.message || "创建失败");
          return;
        }
        if (res.data?.id) {
          await syncNodes(res.data.id);
        }
        toast("时间轴模板已创建");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast("操作失败，请检查网络");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 更新字段 ────────────────────────────────────

  const setField = (field: keyof TimelineTemplateFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ─── 渲染 ────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "编辑时间轴模板" : "新建时间轴模板"}
          </DialogTitle>
        </DialogHeader>
      </DialogContent>

      <DialogBody className="max-h-[60vh] overflow-y-auto space-y-6">
        {/* 模板基本信息 */}
        <div className="space-y-4">
          {/* 名称 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.timelineTemplates.name")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="请输入模板名称"
            />
            {formErrors.name && (
              <p className="text-xs text-destructive mt-1">
                {formErrors.name}
              </p>
            )}
          </div>

          {/* 描述 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.timelineTemplates.description")}
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="模板描述（可选）"
              rows={2}
            />
          </div>

          {/* 启用状态 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="timeline-template-active"
              checked={form.is_active}
              onChange={(e) => setField("is_active", e.target.checked)}
              className="size-4 rounded"
            />
            <label
              htmlFor="timeline-template-active"
              className="text-sm text-text-secondary cursor-pointer"
            >
              {t("contracts.timelineTemplates.active")}
            </label>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t" />

        {/* 节点编辑器 */}
        <TimelineNodeEditor
          nodes={draftNodes}
          onChange={setDraftNodes}
        />
      </DialogBody>

      <DialogFooter className="border-t pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !form.name.trim()}
        >
          {submitting ? "保存中..." : isEdit ? "更新" : "创建"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
