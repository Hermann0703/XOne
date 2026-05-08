"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractStore, type ContractCategory } from "./store";

const PAGE_SIZE = 10;

type FormData = {
  name: string;
  code: string;
  fonds_id: string;       // select value as string
  parent_id: string;      // select value as string
  description: string;
};

const INITIAL: FormData = {
  name: "",
  code: "",
  fonds_id: "",
  parent_id: "",
  description: "",
};

export default function CategoryManager() {
  const {
    categories,
    fonds,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchFonds,
  } = useContractStore();

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormData>({ ...INITIAL });
  const [editId, setEditId] = useState<number | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchFonds()]).then(() => setLoading(false));
  }, [fetchCategories, fetchFonds]);

  // ── pagination ──
  const totalPages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = useMemo(
    () => categories.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [categories, safePage]
  );

  // ── helpers ──
  const fondsName = (id: number | undefined) => {
    if (!id) return "-";
    return fonds.find((f) => f.id === id)?.name ?? "-";
  };

  const categoryName = (id: number | undefined) => {
    if (!id) return "-";
    return categories.find((c) => c.id === id)?.name ?? "-";
  };

  const fondsOptions = [
    { value: "", label: "无" },
    ...fonds.map((f) => ({ value: String(f.id), label: f.name })),
  ];

  const parentOptions = [
    { value: "", label: "无（顶级分类）" },
    ...categories
      .filter((c) => c.id !== editId)
      .map((c) => ({ value: String(c.id), label: c.name })),
  ];

  // ── actions ──
  const openCreate = () => {
    setIsEdit(false);
    setEditId(null);
    setEditing({ ...INITIAL });
    setDialogOpen(true);
  };

  const openEdit = (c: ContractCategory) => {
    setIsEdit(true);
    setEditId(c.id);
    setEditing({
      name: c.name,
      code: c.code,
      fonds_id: c.fonds_id ? String(c.fonds_id) : "",
      parent_id: c.parent_id ? String(c.parent_id) : "",
      description: (c as any).description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editing.name.trim() || !editing.code.trim()) return;
    setSubmitting(true);
    const payload = {
      name: editing.name.trim(),
      code: editing.code.trim(),
      fonds_id: editing.fonds_id ? Number(editing.fonds_id) : undefined,
      parent_id: editing.parent_id ? Number(editing.parent_id) : undefined,
      description: editing.description.trim() || undefined,
    };
    if (isEdit && editId) {
      await updateCategory(editId, payload);
    } else {
      await createCategory(payload);
    }
    setSubmitting(false);
    setDialogOpen(false);
    fetchCategories();
  };

  const handleDelete = async (c: ContractCategory) => {
    if (!confirm(`确定删除分类「${c.name}」吗？`)) return;
    await deleteCategory(c.id);
    fetchCategories();
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">分类管理</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          新建分类
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>编码</TableHead>
                    <TableHead>所属全宗</TableHead>
                    <TableHead>父分类</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-text-secondary py-10"
                      >
                        暂无分类数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageData.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {c.code}
                        </TableCell>
                        <TableCell className="text-sm text-text-secondary">
                          {fondsName(c.fonds_id)}
                        </TableCell>
                        <TableCell className="text-sm text-text-secondary">
                          {categoryName(c.parent_id)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleDelete(c)}
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* ── 分页器 ── */}
              {categories.length > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-sm text-text-secondary">
                    共 {categories.length} 条，第 {safePage}/{totalPages} 页
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="size-3.5" />
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      下一页
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 新建/编辑 Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? "编辑分类" : "新建分类"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                名称 *
              </label>
              <Input
                value={editing.name}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="分类名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                编码 *
              </label>
              <Input
                value={editing.code}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, code: e.target.value }))
                }
                placeholder="分类编码"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                所属全宗
              </label>
              <Select
                options={fondsOptions}
                value={editing.fonds_id}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, fonds_id: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                父分类
              </label>
              <Select
                options={parentOptions}
                value={editing.parent_id}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, parent_id: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                描述
              </label>
              <Textarea
                value={editing.description}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="分类描述"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting || !editing.name.trim() || !editing.code.trim()
              }
            >
              {submitting ? "保存中..." : isEdit ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
