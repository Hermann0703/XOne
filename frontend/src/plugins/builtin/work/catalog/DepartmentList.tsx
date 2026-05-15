"use client";

// 组织架构列表页 - 台账管理子页面
// 展示所有部门，支持搜索、新增、编辑、删除

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiDelete } from "@/lib/api/client";
import DepartmentForm from "./DepartmentForm";
import type { Department } from "./DepartmentForm";

// ─── 主组件 ──────────────────────────────────────────

export default function DepartmentList() {
  // 列表
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // 表单弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── 数据加载 ────────────────────────────────────

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (search) params.search = search;
      const res = await apiGet<Department[]>(
        "/work/contracts/departments",
        params
      );
      if (res.code === 0) {
        setDepartments(res.data || []);
      }
    } catch {
      toast("加载失败，请检查网络");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // ─── 表单操作 ────────────────────────────────────

  const openCreate = () => {
    setEditingDept(null);
    setFormOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchDepartments();
  };

  // ─── 删除 ────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiDelete(
        `/work/contracts/departments/${deleteTarget.id}`
      );
      if (res.code === 0) {
        toast("部门已删除");
        setDeleteTarget(null);
        fetchDepartments();
      } else {
        toast(res.message || "删除失败");
      }
    } catch {
      toast("删除失败，请检查网络");
    } finally {
      setDeleting(false);
    }
  };

  // ─── 渲染 ────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          新增部门
        </Button>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
          <Input
            placeholder="搜索部门名称/ID..."
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
                    <TableHead className="w-[100px]">部门ID</TableHead>
                    <TableHead>部门名称</TableHead>
                    <TableHead className="w-[100px]">负责人</TableHead>
                    <TableHead className="w-[120px]">业务对接人</TableHead>
                    <TableHead className="w-[120px]">IT对接人</TableHead>
                    <TableHead className="w-[200px]">备注</TableHead>
                    <TableHead className="w-[100px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-text-secondary">
                          <p className="text-sm">暂无部门数据</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openCreate}
                          >
                            <Plus className="size-3 mr-1" />
                            新增部门
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-mono text-sm">
                          {dept.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {dept.name}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {dept.leader || "-"}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {dept.business_contact || "-"}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {dept.it_contact || "-"}
                        </TableCell>
                        <TableCell className="text-text-secondary max-w-[200px] truncate">
                          {dept.remarks || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(dept)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(dept)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* 新增 / 编辑弹窗 */}
      <DepartmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editingDept}
        onSuccess={handleFormSuccess}
      />

      {/* 删除确认弹窗 */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除部门「{deleteTarget?.name}」（ID: {deleteTarget?.id}
              ）吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
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
