"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useContractStore, type Supplier } from "./store";

// ─── 状态映射 ────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "启用", className: "bg-green-100 text-green-700 border-green-300" },
  inactive: { label: "停用", className: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600" },
  blacklisted: { label: "黑名单", className: "bg-red-100 text-red-700 border-red-300" },
};

const RATING_LABELS: Record<string, string> = {
  A: "A 级",
  B: "B 级",
  C: "C 级",
  D: "D 级",
};

// ─── 主组件 ──────────────────────────────────────────

export default function SupplierList() {
  const t = useTranslations();
  const {
    suppliers,
    supplierPaging,
    supplierLoading,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  } = useContractStore();
  const router = useRouter();

  // 筛选
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSuppliers = useCallback(() => {
    fetchSuppliers(search, "", page, pageSize);
  }, [search, page, fetchSuppliers]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteSupplier(deleteTarget.id);
    setDeleting(false);
    if (ok) {
      setDeleteTarget(null);
      loadSuppliers();
    }
  };

  const totalPages = supplierPaging
    ? Math.ceil(supplierPaging.total / pageSize)
    : 1;

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 + 新建按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">供应商管理</h2>
          <p className="text-sm text-text-secondary mt-1">
            管理企业供应商信息，共 {supplierPaging?.total ?? "—"} 条记录
          </p>
        </div>
        <Button onClick={() => router.push('/work/contracts/suppliers/new')} className="gap-1.5 shadow-sm">
          <Plus className="size-4" />
          新增供应商
        </Button>
      </div>

      {/* 供应商列表卡片 — 含搜索 + 表格 */}
      <Card className="shadow-none border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">供应商列表</CardTitle>
            {/* 搜索栏内嵌在 CardHeader */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
              <Input
                placeholder="搜索名称、联系人、电话..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {supplierLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[200px]">名称</TableHead>
                    <TableHead className="w-[80px]">联系人</TableHead>
                    <TableHead className="w-[120px]">电话</TableHead>
                    <TableHead className="w-[70px]">评级</TableHead>
                    <TableHead className="w-[80px]">状态</TableHead>
                    <TableHead className="w-[120px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-14">
                        <div className="flex flex-col items-center justify-center gap-4 text-center">
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/50">
                            <Building2 className="w-7 h-7 text-muted-foreground/60" />
                          </div>
                          <div>
                            <p className="text-base font-medium text-foreground">
                              暂无供应商
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              点击「新增供应商」按钮开始添加
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((s) => {
                      const statusConfig =
                        STATUS_MAP[s.status || ""] || STATUS_MAP.inactive;
                      return (
                        <TableRow
                          key={s.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Building2 className="size-3.5 text-primary/70" />
                              </div>
                              {s.name}
                            </div>
                          </TableCell>
                          <TableCell>{s.contacts?.[0]?.name || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {s.contacts?.[0]?.phone || "-"}
                          </TableCell>
                          <TableCell>
                            {s.rating ? (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {RATING_LABELS[s.rating] || s.rating}
                              </Badge>
                            ) : (
                              <span className="text-text-tertiary">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`inline-flex items-center gap-1 text-xs px-1.5 py-0 ${statusConfig.className}`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  s.status === "active"
                                    ? "bg-green-500"
                                    : s.status === "blacklisted"
                                    ? "bg-red-500"
                                    : "bg-gray-400"
                                }`}
                              />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="查看"
                                aria-label="查看供应商"
                                onClick={() => router.push(`/work/contracts/suppliers/${s.id}`)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="编辑"
                                aria-label="编辑供应商"
                                onClick={() => router.push(`/work/contracts/suppliers/${s.id}/edit`)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="删除"
                                aria-label="删除供应商"
                                onClick={() => setDeleteTarget(s)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* 分页器 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-4">
                  <div className="text-sm text-text-secondary">
                    共 {supplierPaging?.total ?? 0} 条记录
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </Button>
                    <span className="text-sm tabular-nums px-2">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
              确定要删除供应商「{deleteTarget?.name}」吗？此操作不可撤销。
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
