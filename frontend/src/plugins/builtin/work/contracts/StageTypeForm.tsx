"use client";

// 合同阶段类型创建/编辑弹窗
// 通过 Dialog 展示，支持新建和编辑两种模式

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiPost, apiPatch } from "@/lib/api/client";

// ─── 类型定义 ────────────────────────────────────────

export interface StageType {
  id: number;
  name: string;
  code: string;
  color: string;
  default_status: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StageTypeFormData {
  name: string;
  code: string;
  color: string;
  default_status: string;
  description: string;
  sort_order: number;
}

// ─── 预设选项 ─────────────────────────────────────────

const COLOR_OPTIONS = [
  { value: "blue", label: "蓝色" },
  { value: "amber", label: "琥珀色" },
  { value: "green", label: "绿色" },
  { value: "purple", label: "紫色" },
  { value: "pink", label: "粉色" },
  { value: "red", label: "红色" },
  { value: "gray", label: "灰色" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "signed", label: "已签署" },
  { value: "in_progress", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "terminated", label: "已终止" },
];

// ─── Props ───────────────────────────────────────────

interface StageTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 编辑模式下传入已有数据 */
  editData?: StageType | null;
  /** 创建/更新成功后的回调 */
  onSuccess?: () => void;
}

// ─── 初始值 ──────────────────────────────────────────

const INITIAL_FORM: StageTypeFormData = {
  name: "",
  code: "",
  color: "blue",
  default_status: "draft",
  description: "",
  sort_order: 0,
};

// ─── 组件 ────────────────────────────────────────────

export default function StageTypeForm({
  open,
  onOpenChange,
  editData,
  onSuccess,
}: StageTypeFormProps) {
  const t = useTranslations();

  const isEdit = !!editData;
  const editId = editData?.id ?? null;

  const [form, setForm] = useState<StageTypeFormData>({ ...INITIAL_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // 弹窗打开 / 编辑数据变化时同步表单
  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          name: editData.name || "",
          code: editData.code || "",
          color: editData.color || "blue",
          default_status: editData.default_status || "draft",
          description: editData.description || "",
          sort_order: editData.sort_order ?? 0,
        });
      } else {
        setForm({ ...INITIAL_FORM });
      }
      setFormErrors({});
    }
  }, [open, editData]);

  // ─── 校验 ────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "请输入阶段名称";
    if (!isEdit && !form.code.trim()) {
      errors.code = "请输入阶段编码";
    }
    if (form.code && !/^[a-z_]+$/.test(form.code)) {
      errors.code =
        "编码格式不正确，需为全小写字母和下划线";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── 提交 ────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        color: form.color,
        default_status: form.default_status,
        description: form.description.trim() || undefined,
        sort_order: form.sort_order,
      };
      if (!isEdit) {
        payload.code = form.code.trim();
      }

      if (isEdit && editId) {
        const res = await apiPatch<StageType>(
          `/work/contracts/stage-types/${editId}`,
          payload
        );
        if (res.code !== 0) {
          toast(res.message || "更新失败");
          return;
        }
        toast("阶段类型已更新");
      } else {
        const res = await apiPost<StageType>(
          "/work/contracts/stage-types",
          payload
        );
        if (res.code !== 0) {
          if (res.message) {
            setFormErrors((prev) => ({ ...prev, code: res.message }));
          }
          toast(res.message || "创建失败");
          return;
        }
        toast("阶段类型已创建");
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

  const setField = (field: keyof StageTypeFormData, value: unknown) => {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("contracts.stageTypes.editStageType")
              : t("contracts.stageTypes.addStageType")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 名称 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.name")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="请输入阶段名称"
            />
            {formErrors.name && (
              <p className="text-xs text-destructive mt-1">
                {formErrors.name}
              </p>
            )}
          </div>

          {/* 编码 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.code")}{" "}
              {!isEdit && <span className="text-destructive">*</span>}
            </label>
            <Input
              value={form.code}
              onChange={(e) => setField("code", e.target.value)}
              placeholder="例如：drafting"
              disabled={isEdit}
            />
            {formErrors.code && (
              <p className="text-xs text-destructive mt-1">
                {formErrors.code}
              </p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground mt-1">
                编码创建后不可修改
              </p>
            )}
          </div>

          {/* 颜色 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.color")}
            </label>
            <Select
              value={form.color}
              options={COLOR_OPTIONS}
              onChange={(e) => setField("color", e.target.value)}
            />
          </div>

          {/* 默认状态 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.defaultStatus")}
            </label>
            <Select
              value={form.default_status}
              options={STATUS_OPTIONS}
              onChange={(e) => setField("default_status", e.target.value)}
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.description")}
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="阶段描述（可选）"
              rows={2}
            />
          </div>

          {/* 排序 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.stageTypes.sortOrder")}
            </label>
            <Input
              type="number"
              value={String(form.sort_order)}
              onChange={(e) =>
                setField("sort_order", Number(e.target.value) || 0)
              }
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !form.name.trim() ||
              (!isEdit && !form.code.trim())
            }
          >
            {submitting ? "保存中..." : isEdit ? "更新" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
