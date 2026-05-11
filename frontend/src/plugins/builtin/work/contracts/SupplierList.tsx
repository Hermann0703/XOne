"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

// ─── 初始表单 ────────────────────────────────────────

const INITIAL_FORM: Partial<Supplier> = {
  name: "",
  contact_person: "",
  contact_phone: "",
  address: "",
  business_license: "",
  tax_id: "",
  bank_name: "",
  bank_account: "",
  rating: "B",
  status: "active",
  notes: "",
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

  // 筛选
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // 弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Supplier>>({ ...INITIAL_FORM });
  const [isEdit, setIsEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSuppliers = useCallback(() => {
    fetchSuppliers(search, statusFilter, page, pageSize);
  }, [search, statusFilter, page, fetchSuppliers]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // ── 弹窗操作 ──

  const openCreate = () => {
    setIsEdit(false);
    setEditing({ ...INITIAL_FORM });
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setIsEdit(true);
    setEditing({
      ...s,
    });
    setDialogOpen(true);
  };

  const setField = (field: string, value: unknown) => {
    setEditing((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!editing.name?.trim()) return;
    setSubmitting(true);
    if (isEdit && editing.id) {
      await updateSupplier(editing.id, editing);
    } else {
      await createSupplier(editing);
    }
    setSubmitting(false);
    setDialogOpen(false);
    loadSuppliers();
  };

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
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">供应商管理</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          新增供应商
        </Button>
      </div>

      {/* 搜索筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
              <Input
                placeholder="搜索供应商名称、联系人、电话..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              options={[
                { value: "", label: "全部状态" },
                { value: "active", label: "启用" },
                { value: "inactive", label: "停用" },
                { value: "blacklisted", label: "黑名单" },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              placeholder="状态筛选"
            />
          </div>
        </CardContent>
      </Card>

      {/* 数据表格 */}
      <Card>
        <CardContent className="pt-6">
          {supplierLoading ? (
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
                    <TableHead>名称</TableHead>
                    <TableHead className="w-[100px]">联系人</TableHead>
                    <TableHead className="w-[130px]">电话</TableHead>
                    <TableHead className="w-[80px]">评级</TableHead>
                    <TableHead className="w-[80px]">状态</TableHead>
                    <TableHead className="w-[130px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                            <Building2 className="w-7 h-7 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-lg font-medium text-foreground">
                              暂无供应商
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              点击「新增供应商」按钮添加第一个供应商
                            </p>
                          </div>
                          <Button onClick={openCreate} className="gap-1.5">
                            <Plus className="w-4 h-4" />
                            新增供应商
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((s) => {
                      const statusConfig =
                        STATUS_MAP[s.status || ""] || STATUS_MAP.inactive;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            {s.name}
                          </TableCell>
                          <TableCell>{s.contact_person || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {s.contact_phone || "-"}
                          </TableCell>
                          <TableCell>
                            {s.rating ? (
                              <Badge variant="outline">
                                {RATING_LABELS[s.rating] || s.rating}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`inline-flex items-center gap-1 ${statusConfig.className}`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  s.status === "active"
                                    ? "bg-green-500"
                                    : s.status === "blacklisted"
                                    ? "bg-red-500"
                                    : "bg-gray-500"
                                }`}
                              />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="编辑"
                                aria-label="编辑供应商"
                                onClick={() => openEdit(s)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="删除"
                                aria-label="删除供应商"
                                onClick={() => setDeleteTarget(s)}
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

              {/* 分页器 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
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
                    <span className="text-sm px-2">
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

      {/* 新建/编辑弹窗 */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialogOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "编辑供应商" : "新增供应商"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* 基本信息 */}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                名称 <span className="text-destructive">*</span>
              </label>
              <Input
                value={editing.name || ""}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="请输入供应商名称"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1">
                  联系人
                </label>
                <Input
                  value={editing.contact_person || ""}
                  onChange={(e) => setField("contact_person", e.target.value)}
                  placeholder="联系人姓名"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1">
                  电话
                </label>
                <Input
                  value={editing.contact_phone || ""}
                  onChange={(e) => setField("contact_phone", e.target.value)}
                  placeholder="联系电话"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                地址
              </label>
              <Input
                value={editing.address || ""}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="供应商地址"
              />
            </div>

            {/* 资质信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1">
                  营业执照号
                </label>
                <Input
                  value={editing.business_license || ""}
                  onChange={(e) =>
                    setField("business_license", e.target.value)
                  }
                  placeholder="营业执照号"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1">
                  税号
                </label>
                <Input
                  value={editing.tax_id || ""}
                  onChange={(e) => setField("tax_id", e.target.value)}
                  placeholder="纳税人识别号"
                />
              </div>
            </div>

            {/* 银行信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1">
                  开户行
                </label>
                <Input
                  value={editing.bank_name || ""}
                  onChange={(e) => setField("bank_name", e.target.value)}
                  placeholder="开户银行名称"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1">
                  银行账号
                </label>
                <Input
                  value={editing.bank_account || ""}
                  onChange={(e) => setField("bank_account", e.target.value)}
                  placeholder="银行账号"
                />
              </div>
            </div>

            {/* 评级与状态 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1">
                  评级
                </label>
                <Select
                  options={[
                    { value: "A", label: "A 级" },
                    { value: "B", label: "B 级" },
                    { value: "C", label: "C 级" },
                    { value: "D", label: "D 级" },
                  ]}
                  value={editing.rating || "B"}
                  onChange={(e) => setField("rating", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1">
                  状态
                </label>
                <Select
                  options={[
                    { value: "active", label: "启用" },
                    { value: "inactive", label: "停用" },
                    { value: "blacklisted", label: "黑名单" },
                  ]}
                  value={editing.status || "active"}
                  onChange={(e) => setField("status", e.target.value)}
                />
              </div>
            </div>

            {/* 备注 */}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                备注
              </label>
              <Textarea
                value={editing.notes || ""}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="备注信息"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !editing.name?.trim()}
            >
              {submitting ? "保存中..." : isEdit ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <DialogFooter>
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
