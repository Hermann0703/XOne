"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableHead, TableHeader, TableRow, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, ShoppingCart, ExternalLink } from "lucide-react";
import { useShoppingStore, type ShoppingItem } from "./store";
import ShoppingForm from "./ShoppingForm";

const PRIORITY_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  high: { label: "高", variant: "destructive" },
  medium: { label: "中", variant: "warning" },
  low: { label: "低", variant: "success" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "success" | "outline" }> = {
  pending: { label: "待购", variant: "default" },
  purchased: { label: "已购", variant: "success" },
  cancelled: { label: "取消", variant: "outline" },
};

export default function ShoppingList() {
  const {
    items,
    loading,
    fetchItems,
    deleteItem,
    setEditingItem,
  } = useShoppingStore();

  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ShoppingItem | null>(null);

  const loadItems = useCallback(() => {
    const params: Record<string, unknown> = {};
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (search) params.search = search;
    fetchItems(params);
  }, [fetchItems, statusFilter, categoryFilter, priorityFilter, search]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  const handleAdd = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: ShoppingItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDelete = async (item: ShoppingItem) => {
    setDeleteConfirm(item);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteItem(deleteConfirm.id);
      setDeleteConfirm(null);
      loadItems();
    }
  };

  const handleSaved = () => {
    loadItems();
  };

  const formatPrice = (price: number) => {
    return `¥${(price || 0).toFixed(2)}`;
  };

  const renderSkeleton = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-button" />
        ))}
        <Skeleton className="h-9 w-48 rounded-input ml-auto" />
        <Skeleton className="h-9 w-28 rounded-button" />
      </div>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-card" />
      ))}
    </div>
  );

  if (loading && items.length === 0) {
    return <div className="p-1">{renderSkeleton()}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="全部状态"
          options={[
            { value: "pending", label: "待购" },
            { value: "purchased", label: "已购" },
            { value: "cancelled", label: "取消" },
          ]}
        />
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          placeholder="全部优先级"
          options={[
            { value: "high", label: "高优先级" },
            { value: "medium", label: "中优先级" },
            { value: "low", label: "低优先级" },
          ]}
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          placeholder="全部分类"
          options={categories.map((c) => ({ value: c, label: c }))}
        />
        <div className="relative flex-1 min-w-[180px] max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索名称..."
            className="pl-9"
          />
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="size-4" />
          添加
        </Button>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <ShoppingCart className="size-12 mb-3 opacity-30" />
          <p className="text-sm">暂无购物项</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>预算</TableHead>
                <TableHead>店铺</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
                const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                const subtotal = (item.price || 0) * (item.quantity || 1);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.name}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-text-primary">{item.name}</span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-xs text-text-secondary mt-0.5 truncate max-w-[200px]">
                          {item.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.category ? (
                        <span className="text-sm text-text-secondary">{item.category}</span>
                      ) : (
                        <span className="text-xs text-text-secondary/50">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-text-primary">
                        {formatPrice(item.price)}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-xs text-text-secondary ml-1">
                          (小计: {formatPrice(subtotal)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-text-primary">{item.quantity}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={priority.variant}>{priority.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.budget ? (
                        <span className="text-sm text-text-secondary">{item.budget.name}</span>
                      ) : (
                        <span className="text-xs text-text-secondary/50">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.store ? (
                        <span className="text-sm text-text-secondary">{item.store}</span>
                      ) : (
                        <span className="text-xs text-text-secondary/50">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(item)}
                          title="编辑"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(item)}
                          title="删除"
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
            确定要删除 <span className="font-medium text-text-primary">&ldquo;{deleteConfirm?.name}&rdquo;</span> 吗？此操作无法撤销。
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
      <ShoppingForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} />
    </div>
  );
}
