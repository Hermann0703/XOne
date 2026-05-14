"use client";

// 密级创建/编辑弹窗
// 通过 Dialog 展示，支持新建和编辑两种模式

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiPost, apiPatch } from "@/lib/api/client";

// ─── 类型定义 ────────────────────────────────────────

export interface Classification {
  id: number;
  name: string;
  code: string;
  level: number;
  color: string;
  description?: string;
}

interface ClassificationFormData {
  name: string;
  code: string;
  level: number;
  color: string;
  description: string;
}

// ─── Props ───────────────────────────────────────────

interface ClassificationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: Classification | null;
  onSuccess?: () => void;
}

// ─── 预设颜色 ────────────────────────────────────────

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#10B981", "#3B82F6",
  "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6", "#78716C",
];

// ─── 初始值 ──────────────────────────────────────────

const INITIAL_FORM: ClassificationFormData = {
  name: "",
  code: "",
  level: 1,
  color: "#EF4444",
  description: "",
};

// ─── 组件 ────────────────────────────────────────────

export default function ClassificationForm({
  open,
  onOpenChange,
  editData,
  onSuccess,
}: ClassificationFormProps) {
  const t = useTranslations();

  const isEdit = !!editData;
  const editId = editData?.id ?? null;

  const [form, setForm] = useState<ClassificationFormData>({ ...INITIAL_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // 弹窗打开 / 编辑数据变化时同步表单
  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          name: editData.name || "",
          code: editData.code || "",
          level: editData.level ?? 1,
          color: editData.color || "#EF4444",
          description: editData.description || "",
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
    if (!form.name.trim()) errors.name = "请输入名称";
    if (!isEdit && !form.code.trim()) errors.code = "请输入编码";
    if (form.code && !/^[a-z_][a-z0-9_]*$/.test(form.code)) {
      errors.code = "编码格式不正确";
    }
    if (form.level < 1 || form.level > 5) {
      errors.level = "等级需在 1-5 之间";
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
        level: form.level,
        color: form.color,
        description: form.description.trim() || undefined,
      };
      if (!isEdit) {
        payload.code = form.code.trim();
      }

      if (isEdit && editId) {
        const res = await apiPatch<Classification>(
          `/work/contracts/classifications/${editId}`,
          payload
        );
        if (res.code === 0) {
          toast("密级已更新");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast(res.message || "更新失败");
        }
      } else {
        const res = await apiPost<Classification>(
          "/work/contracts/classifications",
          payload
        );
        if (res.code === 0) {
          toast("密级已创建");
          onOpenChange(false);
          onSuccess?.();
        } else {
          if (res.message) {
            setFormErrors((prev) => ({ ...prev, code: res.message }));
          }
          toast(res.message || "创建失败");
        }
      }
    } catch {
      toast("操作失败，请检查网络");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 更新字段 ────────────────────────────────────

  const setField = (field: string, value: unknown) => {
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("contracts.classifications.editType")
              : t("contracts.classifications.addType")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 名称 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.classifications.name")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="请输入密级名称"
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
              {t("contracts.classifications.code")}{" "}
              {!isEdit && <span className="text-destructive">*</span>}
            </label>
            <Input
              value={form.code}
              onChange={(e) => setField("code", e.target.value)}
              placeholder="例如：top_secret"
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

          {/* 等级 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.classifications.level")} (1-5)
            </label>
            <Input
              type="number"
              min={1}
              max={5}
              value={String(form.level)}
              onChange={(e) =>
                setField("level", Math.min(5, Math.max(1, Number(e.target.value) || 1)))
              }
              placeholder="1-5"
            />
            {formErrors.level && (
              <p className="text-xs text-destructive mt-1">
                {formErrors.level}
              </p>
            )}
          </div>

          {/* 颜色 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.classifications.color")}
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={form.color}
                onChange={(e) => setField("color", e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <span className="text-sm text-text-secondary">{form.color}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setField("color", c)}
                  className={`size-7 rounded-full border-2 transition-all ${
                    form.color === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.classifications.description")}
            </label>
            <Input
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="密级描述（可选）"
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
