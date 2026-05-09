"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useShoppingStore, type Budget } from "./store";

interface BudgetFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  name: "",
  amount: "",
  category: "",
  period: "monthly" as "monthly" | "weekly" | "yearly",
  start_date: "",
  end_date: "",
  notes: "",
  is_active: true,
};

export default function BudgetForm({ open, onClose, onSaved }: BudgetFormProps) {
  const { editingBudget, createBudget, updateBudget, setEditingBudget } = useShoppingStore();

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!editingBudget;

  useEffect(() => {
    if (open) {
      if (editingBudget) {
        setForm({
          name: editingBudget.name || "",
          amount: editingBudget.amount != null ? String(editingBudget.amount) : "",
          category: editingBudget.category || "",
          period: editingBudget.period || "monthly",
          start_date: editingBudget.start_date || "",
          end_date: editingBudget.end_date || "",
          notes: editingBudget.notes || "",
          is_active: editingBudget.is_active,
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
    }
  }, [open, editingBudget]);

  const setField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "请输入预算名称";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      errs.amount = "请输入有效金额";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const data: Partial<Budget> = {
      name: form.name.trim(),
      amount: Number(form.amount),
      category: form.category.trim() || undefined,
      period: form.period,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      notes: form.notes.trim() || undefined,
      is_active: form.is_active,
    };

    let result: Budget | null;
    if (isEdit && editingBudget) {
      result = await updateBudget(editingBudget.id, data);
    } else {
      result = await createBudget(data);
    }

    setSubmitting(false);
    if (result) {
      setEditingBudget(null);
      onSaved();
      onClose();
    }
  };

  const handleClose = () => {
    setEditingBudget(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "编辑预算" : "添加预算"}</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Name */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1">
            名称 <span className="text-destructive">*</span>
          </label>
          <Input
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="预算名称，如: 每月食品"
          />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>

        {/* Amount + Period */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">
              金额 (¥) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              placeholder="0.00"
            />
            {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">周期</label>
            <Select
              value={form.period}
              onChange={(e) => setField("period", e.target.value)}
              options={[
                { value: "weekly", label: "每周" },
                { value: "monthly", label: "每月" },
                { value: "yearly", label: "每年" },
              ]}
            />
          </div>
        </div>

        {/* Category + Active */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">分类</label>
            <Input
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              placeholder="如: 食品, 电子"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">启用</label>
            <Select
              value={form.is_active ? "true" : "false"}
              onChange={(e) => setField("is_active", e.target.value === "true")}
              options={[
                { value: "true", label: "是" },
                { value: "false", label: "否" },
              ]}
            />
          </div>
        </div>

        {/* Start Date + End Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">开始日期</label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => setField("start_date", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1">结束日期</label>
            <Input
              type="date"
              value={form.end_date}
              onChange={(e) => setField("end_date", e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1">备注</label>
          <Textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="备注信息"
            rows={3}
          />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "保存中..." : isEdit ? "更新" : "添加"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
