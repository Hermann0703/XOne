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
import { useContractStore, type Classification } from "./store";

const PAGE_SIZE = 10;

const LEVEL_OPTIONS = [
  { value: "1", label: "1 级" },
  { value: "2", label: "2 级" },
  { value: "3", label: "3 级" },
  { value: "4", label: "4 级" },
  { value: "5", label: "5 级" },
];

// 等级→颜色映射 (1=绿→5=红)
const LEVEL_COLORS: Record<number, string> = {
  1: "#22c55e",
  2: "#84cc16",
  3: "#eab308",
  4: "#f97316",
  5: "#ef4444",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "公开",
  2: "内部",
  3: "秘密",
  4: "机密",
  5: "绝密",
};

type FormData = {
  name: string;
  code: string;
  level: string;       // "1"~"5"
  description: string;
  color: string;       // hex color
};

const INITIAL: FormData = {
  name: "",
  code: "",
  level: "1",
  description: "",
  color: LEVEL_COLORS[1],
};

export default function ClassificationManager() {
  const {
    classifications,
    fetchClassifications,
    createClassification,
    updateClassification,
    deleteClassification,
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
    fetchClassifications().then(() => setLoading(false));
  }, [fetchClassifications]);

  // ── pagination ──
  const totalPages = Math.max(1, Math.ceil(classifications.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = useMemo(
    () =>
      classifications.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
      ),
    [classifications, safePage]
  );

  // ── level change → auto color ──
  const handleLevelChange = (level: string) => {
    const num = Number(level);
    setEditing((p) => ({
      ...p,
      level,
      color: LEVEL_COLORS[num] || p.color,
    }));
  };

  // ── actions ──
  const openCreate = () => {
    setIsEdit(false);
    setEditId(null);
    setEditing({ ...INITIAL });
    setDialogOpen(true);
  };

  const openEdit = (c: Classification) => {
    setIsEdit(true);
    setEditId(c.id);
    const level = String(c.level);
    setEditing({
      name: c.name,
      code: c.code,
      level,
      description: c.description || "",
      color:
        (c as any).color ||
        LEVEL_COLORS[c.level] ||
        LEVEL_COLORS[1],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editing.name.trim() || !editing.code.trim()) return;
    setSubmitting(true);
    const payload = {
      name: editing.name.trim(),
      code: editing.code.trim(),
      level: Number(editing.level),
      description: editing.description.trim() || undefined,
      color: editing.color,
    };
    if (isEdit && editId) {
      await updateClassification(editId, payload);
    } else {
      await createClassification(payload);
    }
    setSubmitting(false);
    setDialogOpen(false);
    fetchClassifications();
  };

  const handleDelete = async (c: Classification) => {
    if (!confirm(`确定删除密级「${c.name}」吗？`)) return;
    await deleteClassification(c.id);
    fetchClassifications();
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">密级管理</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          新建密级
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
                    <TableHead className="w-[120px]">等级</TableHead>
                    <TableHead>描述</TableHead>
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
                        暂无密级数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageData.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {c.code}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block size-3 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  (c as any).color as string ||
                                  LEVEL_COLORS[c.level] ||
                                  "#94a3b8",
                              }}
                            />
                            <span className="text-sm">
                              {LEVEL_LABELS[c.level] || `${c.level} 级`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-text-secondary max-w-[200px] truncate">
                          {c.description || "-"}
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
              {classifications.length > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-sm text-text-secondary">
                    共 {classifications.length} 条，第 {safePage}/{totalPages} 页
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
            <DialogTitle>{isEdit ? "编辑密级" : "新建密级"}</DialogTitle>
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
                placeholder="密级名称"
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
                placeholder="密级编码"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                等级
              </label>
              <Select
                options={LEVEL_OPTIONS}
                value={editing.level}
                onChange={(e) => handleLevelChange(e.target.value)}
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
                placeholder="密级描述"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                颜色
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editing.color}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, color: e.target.value }))
                  }
                  className="size-9 rounded border border-border cursor-pointer bg-transparent p-0.5"
                />
                <span className="text-xs font-mono text-text-secondary">
                  {editing.color}
                </span>
              </div>
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
