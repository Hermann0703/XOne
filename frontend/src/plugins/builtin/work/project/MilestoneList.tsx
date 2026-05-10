"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useProjectStore, type Milestone } from "./store";

// ─── 状态映射 ────────────────────────────────────────

const STATUS_MAP: Record<
  Milestone["status"],
  { label: string; color: string; dotColor: string }
> = {
  pending: {
    label: "待开始",
    color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600",
    dotColor: "bg-gray-400 dark:bg-gray-500",
  },
  in_progress: {
    label: "进行中",
    color: "bg-blue-100 text-blue-600 border-blue-300",
    dotColor: "bg-blue-500",
  },
  completed: {
    label: "已完成",
    color: "bg-green-100 text-green-600 border-green-300",
    dotColor: "bg-green-500",
  },
  delayed: {
    label: "已延期",
    color: "bg-red-100 text-red-600 border-red-300",
    dotColor: "bg-red-500",
  },
};

// ─── 进度条 ───────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
      <div
        className="bg-blue-500 h-1.5 rounded-full transition-[width] duration-200"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── 里程碑列表主组件 ──────────────────────────────────

interface MilestoneListProps {
  projectId: string;
}

export default function MilestoneList({ projectId }: MilestoneListProps) {
  const {
    getMilestonesByProject,
    createMilestone,
    updateMilestone,
    deleteMilestone,
  } = useProjectStore();

  const milestones = getMilestonesByProject(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Milestone>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  const openCreateDialog = () => {
    setIsEditMode(false);
    setEditing({
      projectId,
      title: "",
      description: "",
      dueDate: "",
      status: "pending",
      progress: 0,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (m: Milestone) => {
    setIsEditMode(true);
    setEditing({ ...m });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editing.title?.trim()) return;
    if (isEditMode && editing.id) {
      updateMilestone(editing.id, editing as Milestone);
    } else {
      createMilestone({
        projectId,
        title: editing.title!.trim(),
        description: editing.description || "",
        dueDate: editing.dueDate || new Date().toISOString().slice(0, 10),
        status: (editing.status as Milestone["status"]) || "pending",
        progress: editing.progress || 0,
      });
    }
    setDialogOpen(false);
  };

  const handleStatusChange = (m: Milestone, newStatus: Milestone["status"]) => {
    updateMilestone(m.id, { status: newStatus });
  };

  return (
    <div className="max-w-2xl">
      {/* 顶部操作 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Flag className="size-4" />
          项目里程碑
          <Badge variant="secondary" className="text-xs">
            {milestones.length}
          </Badge>
        </h2>
        <Button variant="outline" size="sm" onClick={openCreateDialog}>
          <Plus className="size-3.5 mr-1" />
          添加里程碑
        </Button>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <Flag className="size-10 mx-auto mb-3" />
          <p className="text-sm">暂无里程碑</p>
          <p className="text-xs mt-1">点击上方按钮创建第一个里程碑</p>
        </div>
      ) : (
        /* 时间轴布局 */
        <div className="relative pl-8">
          {/* 左侧竖线 */}
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-6">
            {milestones.map((m, idx) => {
              const status = STATUS_MAP[m.status] || STATUS_MAP.pending;
              const due = new Date(m.dueDate);
              const isPast = due < new Date(new Date().toDateString());

              return (
                <div key={m.id} className="relative">
                  {/* 节点圆圈 */}
                  <div
                    className={`absolute left-[-23px] top-1 size-4 rounded-full border-2 border-white ${status.dotColor} z-10 ring-2 ring-offset-2 ${status.dotColor.replace("bg-", "ring-")}`}
                    style={{ opacity: 0.3 }}
                  />
                  <div
                    className={`absolute left-[-21px] top-2 size-3 rounded-full border-2 border-white ${status.dotColor} z-20`}
                  />

                  {/* 内容卡片 */}
                  <Card className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* 标题行 */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                              {m.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-xs ${status.color}`}
                            >
                              {status.label}
                            </Badge>
                          </div>

                          {/* 描述 */}
                          {m.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                              {m.description}
                            </p>
                          )}

                          {/* 日期 */}
                          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-2">
                            <span>截止：</span>
                            <span className={isPast && m.status !== "completed" ? "text-red-500 font-medium" : ""}>
                              {due.toLocaleDateString("zh-CN")}
                            </span>
                            {isPast && m.status !== "completed" && (
                              <span className="text-red-400">(已逾期)</span>
                            )}
                          </div>

                          {/* 进度条 */}
                          <div className="flex items-center gap-2">
                            <ProgressBar value={m.progress} />
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                              {m.progress}%
                            </span>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {/* 快速状态切换 */}
                          <Select
                            value={m.status}
                            onChange={(e) =>
                              handleStatusChange(m, e.target.value as Milestone["status"])
                            }
                            options={[
                              { value: "pending", label: "待开始" },
                              { value: "in_progress", label: "进行中" },
                              { value: "completed", label: "已完成" },
                              { value: "delayed", label: "已延期" },
                            ]}
                            className="h-7 text-xs w-20"
                          />
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="size-7"
                            aria-label="编辑里程碑"
                            onClick={() => openEditDialog(m)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="size-7"
                            aria-label="删除里程碑"
                            onClick={() => {
                              if (confirm(`确定要删除里程碑「${m.title}」吗？`)) {
                                deleteMilestone(m.id);
                              }
                            }}
                          >
                            <Trash2 className="size-3 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "编辑里程碑" : "添加里程碑"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="field-milestone-title" className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">
                名称 *
              </label>
              <Input
                id="field-milestone-title"
                value={editing.title || ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="里程碑名称"
              />
            </div>
            <div>
              <label htmlFor="field-milestone-description" className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">
                描述
              </label>
              <Input
                id="field-milestone-description"
                value={editing.description || ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="简要描述"
              />
            </div>
            <div>
              <label htmlFor="field-milestone-duedate" className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">
                截止日期
              </label>
              <Input
                id="field-milestone-duedate"
                type="date"
                value={editing.dueDate || ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, dueDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label htmlFor="field-milestone-status" className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">
                状态
              </label>
              <Select
                id="field-milestone-status"
                value={editing.status || "pending"}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, status: e.target.value as Milestone["status"] }))
                }
                options={[
                  { value: "pending", label: "待开始" },
                  { value: "in_progress", label: "进行中" },
                  { value: "completed", label: "已完成" },
                  { value: "delayed", label: "已延期" },
                ]}
              />
            </div>
            <div>
              <label htmlFor="field-milestone-progress" className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">
                进度 ({editing.progress || 0}%)
              </label>
              <Input
                id="field-milestone-progress"
                type="range"
                min="0"
                max="100"
                step="5"
                value={editing.progress || 0}
                onChange={(e) =>
                  setEditing((p) => ({
                    ...p,
                    progress: parseInt(e.target.value),
                  }))
                }
                className="h-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!editing.title?.trim()}
            >
              {isEditMode ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
