"use client";

// 合同类型管理列表页
// 展示所有合同类型，支持搜索、新增、编辑、删除、启用/禁用状态切换

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Tag, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import ContractTypeForm from "./ContractTypeForm";
import type { ContractType as ContractTypeEntity } from "./ContractTypeForm";

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

export default function ContractTypeList() {
  const t = useTranslations();

  // 列表
  const [types, setTypes] = useState<ContractTypeEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // 表单弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<ContractTypeEntity | null>(
    null
  );

  // 删除确认
  const [deleteTarget, setDeleteTarget] =
    useState<ContractTypeEntity | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── 数据加载 ────────────────────────────────────

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (search) params.search = search;
      const res = await apiGet<ContractTypeEntity[]>(
        "/work/contracts/contract-types",
        params
      );
      if (res.code === 0) {
        setTypes(res.data || []);
      }
    } catch {
      toast("加载失败，请检查网络");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  // ─── 表单操作 ────────────────────────────────────

  const openCreate = () => {
    setEditingType(null);
    setFormOpen(true);
  };

  const openEdit = (ct: ContractTypeEntity) => {
    setEditingType(ct);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchTypes();
  };

  // ─── 删除 ────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiDelete(
        `/work/contracts/contract-types/${deleteTarget.id}`
      );
      if (res.code === 0) {
        toast("合同类型已删除");
        setDeleteTarget(null);
        fetchTypes();
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

  const toggleStatus = async (ct: ContractTypeEntity) => {
    try {
      const res = await apiPatch<ContractTypeEntity>(
        `/work/contracts/contract-types/${ct.id}`,
        { is_active: !ct.is_active }
      );
      if (res.code === 0) {
        setTypes((prev) =>
          prev.map((item) => (item.id === ct.id ? res.data : item))
        );
        toast(ct.is_active ? "已禁用" : "已启用");
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
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          {t("contracts.types.addType")}
        </Button>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
          <Input
            placeholder="搜索合同类型..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                    <TableHead>{t("contracts.types.name")}</TableHead>
                    <TableHead className="w-[120px]">
                      {t("contracts.types.code")}
                    </TableHead>
                    <TableHead>{t("contracts.types.description")}</TableHead>
                    <TableHead className="w-[80px]">
                      {t("contracts.types.sortOrder")}
                    </TableHead>
                    <TableHead className="w-[80px]">
                      {t("contracts.types.status")}
                    </TableHead>
                    <TableHead className="w-[130px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                            <Tag className="w-7 h-7 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-lg font-medium text-foreground">
                              {t("contracts.types.noData")}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              点击「{t("contracts.types.addType")}
                              」按钮添加第一个合同类型
                            </p>
                          </div>
                          <Button onClick={openCreate} className="gap-1.5">
                            <Plus className="w-4 h-4" />
                            {t("contracts.types.addType")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    types.map((ct) => {
                      const statusConfig = getStatusConfig(ct.is_active);
                      return (
                        <TableRow key={ct.id}>
                          <TableCell className="font-medium">
                            {ct.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {ct.code || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-text-secondary max-w-[200px] truncate">
                            {ct.description || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {ct.sort_order ?? 0}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => toggleStatus(ct)}
                              className="cursor-pointer"
                              title={ct.is_active ? "点击禁用" : "点击启用"}
                            >
                              <Badge
                                variant="outline"
                                className={`inline-flex items-center gap-1 transition-colors ${statusConfig.className}`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    ct.is_active
                                      ? "bg-green-500"
                                      : "bg-gray-500"
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
                                aria-label="编辑合同类型"
                                onClick={() => openEdit(ct)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="删除"
                                aria-label="删除合同类型"
                                onClick={() => setDeleteTarget(ct)}
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
      <ContractTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editingType}
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
              {t("contracts.types.deleteConfirm")}
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
