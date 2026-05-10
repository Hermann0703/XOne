"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useShoppingStore, type ShoppingItem, type Budget } from "./store";

interface ShoppingFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  name: "",
  category: "",
  price: "",
  quantity: "1",
  priority: "medium" as "low" | "medium" | "high",
  status: "pending" as "pending" | "purchased" | "cancelled",
  store: "",
  url: "",
  notes: "",
  budget_id: "" as string | number,
};

export default function ShoppingForm({ open, onClose, onSaved }: ShoppingFormProps) {
  const { editingItem, budgets, fetchBudgets, createItem, updateItem, setEditingItem } =
    useShoppingStore();

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!editingItem;

  useEffect(() => {
    if (open) {
      fetchBudgets();
      if (editingItem) {
        setForm({
          name: editingItem.name || "",
          category: editingItem.category || "",
          price: editingItem.price != null ? String(editingItem.price) : "",
          quantity: editingItem.quantity != null ? String(editingItem.quantity) : "1",
          priority: editingItem.priority || "medium",
          status: editingItem.status || "pending",
          store: editingItem.store || "",
          url: editingItem.url || "",
          notes: editingItem.notes || "",
          budget_id: editingItem.budget_id != null ? String(editingItem.budget_id) : "",
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
    }
  }, [open, editingItem, fetchBudgets]);

  const setField = (field: string, value: string) => {
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
    if (!form.name.trim()) errs.name = "请输入名称";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      errs.price = "请输入有效价格";
    }
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 1) {
      errs.quantity = "数量至少为1";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const data: Partial<ShoppingItem> = {
      name: form.name.trim(),
      category: form.category.trim() || undefined,
      price: Number(form.price),
      quantity: Number(form.quantity),
      priority: form.priority as "low" | "medium" | "high",
      status: form.status as "pending" | "purchased" | "cancelled",
      store: form.store.trim() || undefined,
      url: form.url.trim() || undefined,
      notes: form.notes.trim() || undefined,
      budget_id: form.budget_id ? Number(form.budget_id) : undefined,
    };

    let result: ShoppingItem | null;
    if (isEdit && editingItem) {
      result = await updateItem(editingItem.id, data);
    } else {
      result = await createItem(data);
    }

    setSubmitting(false);
    if (result) {
      setEditingItem(null);
      onSaved();
      onClose();
    }
  };

  const handleClose = () => {
    setEditingItem(null);
    onClose();
  };

  const activeBudgets = budgets.filter((b) => b.is_active);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "编辑购物项" : "添加购物项"}</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Name */}
        <div>
          <label htmlFor="field-name" className="text-sm font-medium text-text-secondary block mb-1">
            名称 <span className="text-destructive">*</span>
          </label>
          <Input
            id="field-name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="商品名称"
          />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>

        {/* Price + Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="field-price" className="text-sm font-medium text-text-secondary block mb-1">
              价格 (¥) <span className="text-destructive">*</span>
            </label>
            <Input
              id="field-price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
              placeholder="0.00"
            />
            {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
          </div>
          <div>
            <label htmlFor="field-quantity" className="text-sm font-medium text-text-secondary block mb-1">
              数量 <span className="text-destructive">*</span>
            </label>
            <Input
              id="field-quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setField("quantity", e.target.value)}
              placeholder="1"
            />
            {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity}</p>}
          </div>
        </div>

        {/* Category + Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="field-category" className="text-sm font-medium text-text-secondary block mb-1">分类</label>
            <Input
              id="field-category"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              placeholder="如: 食品, 电子, 服装"
            />
          </div>
          <div>
            <label htmlFor="field-priority" className="text-sm font-medium text-text-secondary block mb-1">优先级</label>
            <Select
              id="field-priority"
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              options={[
                { value: "high", label: "🔴 高" },
                { value: "medium", label: "🟡 中" },
                { value: "low", label: "🟢 低" },
              ]}
            />
          </div>
        </div>

        {/* Status + Budget */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="field-status" className="text-sm font-medium text-text-secondary block mb-1">状态</label>
            <Select
              id="field-status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              options={[
                { value: "pending", label: "待购" },
                { value: "purchased", label: "已购" },
                { value: "cancelled", label: "取消" },
              ]}
            />
          </div>
          <div>
            <label htmlFor="field-budget" className="text-sm font-medium text-text-secondary block mb-1">预算</label>
            <Select
              id="field-budget"
              value={form.budget_id ? String(form.budget_id) : ""}
              onChange={(e) => setField("budget_id", e.target.value)}
              placeholder="无"
              options={activeBudgets.map((b) => ({
                value: String(b.id),
                label: `${b.name} (¥${b.amount})`,
              }))}
            />
          </div>
        </div>

        {/* Store + URL */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="field-store" className="text-sm font-medium text-text-secondary block mb-1">店铺</label>
            <Input
              id="field-store"
              value={form.store}
              onChange={(e) => setField("store", e.target.value)}
              placeholder="购买渠道"
            />
          </div>
          <div>
            <label htmlFor="field-url" className="text-sm font-medium text-text-secondary block mb-1">链接</label>
            <Input
              id="field-url"
              value={form.url}
              onChange={(e) => setField("url", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="field-notes" className="text-sm font-medium text-text-secondary block mb-1">备注</label>
          <Textarea
            id="field-notes"
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
