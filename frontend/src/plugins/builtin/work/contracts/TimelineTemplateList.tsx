"use client";

// 时间轴模板管理列表页
// 展示所有时间轴模板，支持搜索、新增、编辑、删除、启用/禁用状态切换

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Search, Clock } from "lucide-react";
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
import TimelineTemplateForm from "./TimelineTemplateForm";
import type { TimelineTemplate } from "./store";

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

export default function TimelineTemplateList() {
  const t = useTranslations();

  // 列表
  const [templates, setTemplates] = useState<TimelineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // 表单弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<TimelineTemplate | null>(null);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<TimelineTemplate | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  // ─── 数据加载 ────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (search) params.search = search;
      const res = await apiGet<TimelineTemplate[]>(
        "/work/contracts/timeline-templates",
        params
      );
      if (res.code === 0) {
        setTemplates(res.data || []);
      }
    } catch {
      toast("加载失败，请检查网络");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ─── 表单操作 ────────────────────────────────────

  const openCreate = () => {
    setEditingTemplate(null);
    setFormOpen(true);
  };

  const openEdit = async (tmpl: TimelineTemplate) => {
    // 获取完整的模板数据（含节点）
    try {
      const res = await apiGet<TimelineTemplate>(
        `/work/contracts/timeline-templates/${tmpl.id}`
      );
      if (res.code === 0 && res.data) {
        setEditingTemplate(res.data);
        setFormOpen(true);
        return;
      }
    } catch {
      // 降级：用列表中的浅数据打开
    }
    setEditingTemplate(tmpl);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchTemplates();
  };

  // ─── 删除 ────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiDelete(
        `/work/contracts/timeline-templates/${deleteTarget.id}`
      );
      if (res.code === 0) {
        toast("时间轴模板已删除");
        setDeleteTarget(null);
        fetchTemplates();
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

  const toggleStatus = async (tmpl: TimelineTemplate) => {
    try {
      const res = await apiPatch<TimelineTemplate>(
        `/work/contracts/timeline-templates/${tmpl.id}`,
        { is_active: !tmpl.is_active }
      );
      if (res.code === 0) {
        setTemplates((prev) =>
          prev.map((item) => (item.id === tmpl.id ? res.data : item))
        );
        toast(tmpl.is_active ? "已禁用" : "已启用");
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

  const getNodeCount = (tmpl: TimelineTemplate): number => {
    if (tmpl.nodes) return tmpl.nodes.length;
    return 0;
  };

  // ─── 渲染 ────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          {t("contracts.timelineTemplates.addTemplate")}
        </Button>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
          <Input
            placeholder="搜索模板..."
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
                    <TableHead>{t("contracts.timelineTemplates.name")}</TableHead>
                    <TableHead className="w-[100px]">
                      {t("contracts.timelineTemplates.nodeCount")}
                    </TableHead>
                    <TableHead className="w-[80px]">
                      {t("contracts.timelineTemplates.status")}
                    </TableHead>
                    <TableHead className="w-[130px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                            <Clock className="w-7 h-7 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-lg font-medium text-foreground">
                              {t("contracts.timelineTemplates.noData")}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              点击「{t("contracts.timelineTemplates.addTemplate")}
                              」按钮添加第一个时间轴模板
                            </p>
                          </div>
                          <Button onClick={openCreate} className="gap-1.5">
                            <Plus className="w-4 h-4" />
                            {t("contracts.timelineTemplates.addTemplate")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates.map((tmpl) => {
                      const statusConfig = getStatusConfig(tmpl.is_active);
                      return (
                        <TableRow key={tmpl.id}>
                          <TableCell className="font-medium">
                            {tmpl.name}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {getNodeCount(tmpl)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => toggleStatus(tmpl)}
                              className="cursor-pointer"
                              title={tmpl.is_active ? "点击禁用" : "点击启用"}
                            >
                              <Badge
                                variant="outline"
                                className={`inline-flex items-center gap-1 transition-colors ${statusConfig.className}`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    tmpl.is_active
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
                                aria-label="编辑时间轴模板"
                                onClick={() => openEdit(tmpl)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="删除"
                                aria-label="删除时间轴模板"
                                onClick={() => setDeleteTarget(tmpl)}
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
      <TimelineTemplateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editingTemplate}
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
              {t("contracts.timelineTemplates.deleteConfirm")}
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
