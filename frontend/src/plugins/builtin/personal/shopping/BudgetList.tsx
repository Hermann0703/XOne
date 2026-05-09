"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableHead, TableHeader, TableRow, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Wallet } from "lucide-react";
import { useShoppingStore, type Budget } from "./store";
import BudgetForm from "./BudgetForm";

const PERIOD_LABELS: Record<string, string> = {
  weekly: "每周",
  monthly: "每月",
  yearly: "每年",
};

export default function BudgetList() {
  const { budgets, budgetsLoading, fetchBudgets, deleteBudget, setEditingBudget } = useShoppingStore();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Budget | null>(null);

  const load = useCallback(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = () => {
    setEditingBudget(null);
    setFormOpen(true);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormOpen(true);
  };

  const handleDelete = (budget: Budget) => {
    setDeleteConfirm(budget);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteBudget(deleteConfirm.id);
      setDeleteConfirm(null);
      load();
    }
  };

  const handleSaved = () => {
    load();
  };

  const renderSkeleton = () => (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-28 rounded-button" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-card" />
      ))}
    </div>
  );

  if (budgetsLoading && budgets.length === 0) {
    return <div className="p-1">{renderSkeleton()}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="size-4" />
          添加预算
        </Button>
      </div>

      {/* Table */}
      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Wallet className="size-12 mb-3 opacity-30" />
          <p className="text-sm">暂无预算</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>周期</TableHead>
                <TableHead>开始日期</TableHead>
                <TableHead>结束日期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell>
                    <span className="text-text-primary font-medium">{budget.name}</span>
                    {budget.notes && (
                      <p className="text-xs text-text-secondary mt-0.5 truncate max-w-[200px]">
                        {budget.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-text-primary">
                      ¥{(budget.amount || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {budget.category ? (
                      <span className="text-sm text-text-secondary">{budget.category}</span>
                    ) : (
                      <span className="text-xs text-text-secondary/50">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {PERIOD_LABELS[budget.period] || budget.period}
                    </span>
                  </TableCell>
                  <TableCell>
                    {budget.start_date ? (
                      <span className="text-sm text-text-secondary">{budget.start_date}</span>
                    ) : (
                      <span className="text-xs text-text-secondary/50">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {budget.end_date ? (
                      <span className="text-sm text-text-secondary">{budget.end_date}</span>
                    ) : (
                      <span className="text-xs text-text-secondary/50">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={budget.is_active ? "success" : "outline"}>
                      {budget.is_active ? "启用" : "停用"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(budget)}
                        title="编辑"
                      >
                        <Edit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(budget)}
                        title="删除"
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-text-secondary">
            确定要删除预算 <span className="font-medium text-text-primary">&ldquo;{deleteConfirm?.name}&rdquo;</span> 吗？此操作无法撤销。
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            取消
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            删除
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Create/Edit Form Dialog */}
      <BudgetForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} />
    </div>
  );
}
