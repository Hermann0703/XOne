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
  sort_order: number;
  is_active: boolean;
}

export interface ClassificationFormData {
  name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
}

// ─── Props ───────────────────────────────────────────

interface ClassificationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 编辑模式下传入已有数据 */
  editData?: Classification | null;
  /** 创建/更新成功后的回调 */
  onSuccess?: () => void;
}

// ─── 初始值 ──────────────────────────────────────────

const INITIAL_FORM: ClassificationFormData = {
  name: "",
  code: "",
  sort_order: 0,
  is_active: true,
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
          sort_order: editData.sort_order ?? 0,
          is_active: editData.is_active ?? true,
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
    if (!form.name.trim()) errors.name = "请输入密级名称";
    if (!isEdit && !form.code.trim()) {
      errors.code = "请输入密级编码";
    }
    if (form.code && !/^[a-z_][a-z0-9_]*$/.test(form.code)) {
      errors.code =
        "编码格式不正确，需为小写字母/下划线开头，仅含小写字母/数字/下划线";
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
        sort_order: form.sort_order,
        is_active: form.is_active,
      };
      if (!isEdit) {
        payload.code = form.code.trim();
      }

      if (isEdit && editId) {
        const res = await apiPatch<Classification>(
          `/work/contracts/classifications/${editId}`,
          payload
        );
        if (res.code !== 0) {
          toast(res.message || "更新失败");
          return;
        }
        toast("密级已更新");
      } else {
        const res = await apiPost<Classification>(
          "/work/contracts/classifications",
          payload
        );
        if (res.code !== 0) {
          if (res.message) {
            setFormErrors((prev) => ({ ...prev, code: res.message }));
          }
          toast(res.message || "创建失败");
          return;
        }
        toast("密级已创建");
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

  const setField = (field: keyof ClassificationFormData, value: unknown) => {
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
              ? t("contracts.classifications.editClassification")
              : t("contracts.classifications.addClassification")}
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

          {/* 排序 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              {t("contracts.classifications.sortOrder")}
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

          {/* 启用状态 */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-text-secondary">
              {t("contracts.classifications.status")}
            </label>
            <button
              type="button"
              onClick={() => setField("is_active", !form.is_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                form.is_active
                  ? "bg-primary"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                  form.is_active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-text-secondary">
              {form.is_active
                ? t("contracts.classifications.active")
                : t("contracts.classifications.inactive")}
            </span>
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
