"use client";

// 组织架构 - 部门创建/编辑弹窗
// 部门ID为纯数字字符串，允许首位为0（如 001、0101）

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export interface Department {
  id: string;
  name: string;
  leader?: string;
  business_contact?: string;
  it_contact?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentFormData {
  id: string;
  name: string;
  leader: string;
  business_contact: string;
  it_contact: string;
  remarks: string;
}

// ─── Props ───────────────────────────────────────────

interface DepartmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: Department | null;
  onSuccess?: () => void;
}

// ─── 初始值 ──────────────────────────────────────────

const INITIAL_FORM: DepartmentFormData = {
  id: "",
  name: "",
  leader: "",
  business_contact: "",
  it_contact: "",
  remarks: "",
};

// ─── 组件 ────────────────────────────────────────────

export default function DepartmentForm({
  open,
  onOpenChange,
  editData,
  onSuccess,
}: DepartmentFormProps) {
  const t = useTranslations();

  const isEdit = !!editData;
  const editId = editData?.id ?? null;

  const [form, setForm] = useState<DepartmentFormData>({ ...INITIAL_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          id: editData.id || "",
          name: editData.name || "",
          leader: editData.leader || "",
          business_contact: editData.business_contact || "",
          it_contact: editData.it_contact || "",
          remarks: editData.remarks || "",
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
    if (!isEdit && !form.id.trim()) {
      errors.id = "请输入部门ID";
    }
    if (form.id.trim() && !/^\d+$/.test(form.id.trim())) {
      errors.id = "部门ID必须为纯数字";
    }
    if (!form.name.trim()) errors.name = "请输入部门名称";
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
        leader: form.leader.trim() || undefined,
        business_contact: form.business_contact.trim() || undefined,
        it_contact: form.it_contact.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
      };
      if (!isEdit) {
        payload.id = form.id.trim();
      }

      if (isEdit && editId) {
        const res = await apiPatch<Department>(
          `/work/contracts/departments/${editId}`,
          payload
        );
        if (res.code !== 0) {
          toast(res.message || "更新失败");
          return;
        }
        toast("部门已更新");
      } else {
        const res = await apiPost<Department>(
          "/work/contracts/departments",
          payload
        );
        if (res.code !== 0) {
          if (res.message) {
            setFormErrors((prev) => ({
              ...prev,
              ...(res.message?.includes("已存在") ? { id: res.message } : {}),
            }));
          }
          toast(res.message || "创建失败");
          return;
        }
        toast("部门已创建");
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

  const setField = (field: keyof DepartmentFormData, value: string) => {
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
          <DialogTitle>{isEdit ? "编辑部门" : "新增部门"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 部门ID */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              部门 ID{" "}
              {!isEdit && <span className="text-destructive">*</span>}
            </label>
            <Input
              value={form.id}
              onChange={(e) => setField("id", e.target.value)}
              placeholder="例如：001、0101"
              disabled={isEdit}
            />
            {formErrors.id && (
              <p className="text-xs text-destructive mt-1">{formErrors.id}</p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground mt-1">
                部门ID创建后不可修改
              </p>
            )}
          </div>

          {/* 部门名称 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              部门名称 <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="请输入部门名称"
            />
            {formErrors.name && (
              <p className="text-xs text-destructive mt-1">
                {formErrors.name}
              </p>
            )}
          </div>

          {/* 负责人 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              负责人
            </label>
            <Input
              value={form.leader}
              onChange={(e) => setField("leader", e.target.value)}
              placeholder="请输入负责人姓名"
            />
          </div>

          {/* 业务对接人 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              业务对接人
            </label>
            <Input
              value={form.business_contact}
              onChange={(e) => setField("business_contact", e.target.value)}
              placeholder="请输入业务对接人"
            />
          </div>

          {/* IT对接人 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              IT对接人
            </label>
            <Input
              value={form.it_contact}
              onChange={(e) => setField("it_contact", e.target.value)}
              placeholder="请输入IT对接人"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              备注
            </label>
            <Textarea
              value={form.remarks}
              onChange={(e) => setField("remarks", e.target.value)}
              placeholder="备注信息（可选）"
              rows={3}
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
              (!isEdit && !form.id.trim())
            }
          >
            {submitting ? "保存中..." : isEdit ? "更新" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
