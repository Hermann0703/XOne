"use client";

// 通用字典管理列表页
// 顶部按 category 筛选，展示字典项列表，支持新增、编辑、删除、启用/禁用状态切换

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, BookOpen, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiPatch, apiDelete } from "@/lib/api/client";
import LookupDictForm from "./LookupDictForm";
import type { LookupDictItem } from "./LookupDictForm";

// ─── 状态映射 ────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: {
    label: "启用",
    className: "bg-green-100 text-green-700 border-green-300",
  },
  inactive: {
    label: "禁用",
    className:
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600",
  },
};

// ─── 主组件 ──────────────────────────────────────────

export default function LookupDictList() {
  const t = useTranslations();

  // 分类列表
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // 当前选中的 category
  const [activeCategory, setActiveCategory] = useState("");

  // 当前分类的项
  const [items, setItems] = useState<LookupDictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // 表单弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LookupDictItem | null>(null);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<LookupDictItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── 加载分类列表 ────────────────────────────────

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await apiGet<string[]>("/work/lookup/categories");
      if (res.code === 0 && res.data) {
        const cats = Array.isArray(res.data) ? res.data : (res.data as any).categories || [];
        setCategories(cats)
        // 默认选中第一个分类
        if (cats.length > 0 && !activeCategory) {
          setActiveCategory(cats[0]);
        }
      }
    } catch {
      toast("加载分类失败，请检查网络");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ─── 加载当前分类的项 ────────────────────────────

  const fetchItems = useCallback(async () => {
    if (!activeCategory) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, unknown> = { category: activeCategory };
      if (search) params.search = search;
      const res = await apiGet<LookupDictItem[]>("/work/lookup", params);
      if (res.code === 0) {
        setItems(res.data || []);
      }
    } catch {
      toast("加载字典项失败，请检查网络");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ─── 表单操作 ────────────────────────────────────

  const openCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: LookupDictItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchItems();
    fetchCategories(); // 刷新分类列表
  };

  // ─── 删除 ────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiDelete(`/work/lookup/${deleteTarget.id}`);
      if (res.code === 0) {
        toast("字典项已删除");
        setDeleteTarget(null);
        fetchItems();
        fetchCategories();
      } else {
        toast(res.message || "删除失败");
      }
    } catch {
      toast("删除失败，请检查网络");
    } finally {
      setDeleting(false);
    }
  };

  // ─── 状态切换 ────────────────────────────────────

  const toggleStatus = async (item: LookupDictItem) => {
    try {
      const res = await apiPatch<LookupDictItem>(
        `/work/lookup/${item.id}`,
        { is_active: !item.is_active }
      );
      if (res.code === 0) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? res.data : i))
        );
        toast(item.is_active ? "已禁用" : "已启用");
      } else {
        toast(res.message || "操作失败");
      }
    } catch {
      toast("操作失败，请检查网络");
    }
  };

  // ─── 渲染辅助 ────────────────────────────────────

  const getStatusConfig = (isActive: boolean) => {
    const key = isActive ? "active" : "inactive";
    return STATUS_MAP[key] || STATUS_MAP.inactive;
  };

  // ─── 渲染 ────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* 顶部筛选栏：分类下拉 + 搜索 + 新增按钮 */}
      <div className="flex items-center justify-between">
        <Button onClick={openCreate} disabled={!activeCategory}>
          <Plus className="size-4 mr-1" />
          {t("contracts.lookupDict.addItem")}
        </Button>

        <div className="flex items-center gap-3">
          {/* 分类筛选下拉 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary whitespace-nowrap">
              {t("contracts.lookupDict.category")}:
            </label>
            {categoriesLoading ? (
              <Skeleton className="h-9 w-36 rounded" />
            ) : (
              <Select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                options={categories.map((c) => ({ value: c, label: c }))}
                placeholder="选择分类"
                className="w-36"
              />
            )}
          </div>

          {/* 搜索 */}
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
            <Input
              placeholder="搜索字典项..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("contracts.lookupDict.category")}</TableHead>
                    <TableHead className="w-[120px]">
                      {t("contracts.lookupDict.code")}
                    </TableHead>
                    <TableHead>{t("contracts.lookupDict.name")}</TableHead>
                    <TableHead className="w-[80px]">
                      {t("contracts.lookupDict.sortOrder")}
                    </TableHead>
                    <TableHead className="w-[80px]">
                      {t("contracts.lookupDict.status")}
                    </TableHead>
                    <TableHead className="w-[130px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                            <BookOpen className="w-7 h-7 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-lg font-medium text-foreground">
                              {t("contracts.lookupDict.noData")}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              点击「{t("contracts.lookupDict.addItem")}
                              」按钮添加第一个字典项
                            </p>
                          </div>
                          <Button onClick={openCreate} className="gap-1.5">
                            <Plus className="w-4 h-4" />
                            {t("contracts.lookupDict.addItem")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const statusConfig = getStatusConfig(item.is_active);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.code || "-"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.sort_order ?? 0}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => toggleStatus(item)}
                              className="cursor-pointer"
                              title={item.is_active ? "点击禁用" : "点击启用"}
                            >
                              <Badge
                                variant="outline"
                                className={`inline-flex items-center gap-1 transition-colors ${statusConfig.className}`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
item.is_active
                                      ? "bg-success"
                                      : "bg-text-tertiary"
                                  }`}
                                />
                                {statusConfig.label}
                              </Badge>
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="编辑"
                                aria-label="编辑字典项"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="删除"
                                aria-label="删除字典项"
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* 新建/编辑弹窗 */}
      <LookupDictForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editingItem}
        categories={categories}
        defaultCategory={activeCategory}
        onSuccess={handleFormSuccess}
      />

      {/* 删除确认弹窗 */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {t("contracts.lookupDict.deleteConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
