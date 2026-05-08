"use client";

import { useState, useCallback, useRef } from "react";
import { Plus, Trash2, GripVertical, Calendar, User, X, Layout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useProjectStore, type Task, type Column } from "./store";

// ─── 优先级映射 ──────────────────────────────────────

const PRIORITY_MAP: Record<Task["priority"], { label: string; color: string }> = {
  high: { label: "高", color: "bg-red-500" },
  medium: { label: "中", color: "bg-yellow-500" },
  low: { label: "低", color: "bg-green-500" },
};

// ─── 任务卡片组件 ─────────────────────────────────────

function TaskCard({
  task,
  columnId,
  onDragStart,
}: {
  task: Task;
  columnId: string;
  onDragStart: (e: React.DragEvent, taskId: string, colId: string) => void;
}) {
  const { updateTask, deleteTask } = useProjectStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task>({ ...task });

  const priority = PRIORITY_MAP[task.priority];

  const handleSave = () => {
    if (!editing.title.trim()) return;
    updateTask(task.id, editing);
    setDialogOpen(false);
  };

  const isOverdue =
    new Date(task.dueDate) < new Date(new Date().toDateString());

  return (
    <>
      <div
        className="bg-bg-card border rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
        draggable
        onDragStart={(e) => onDragStart(e, task.id, columnId)}
        onClick={() => {
          setEditing({ ...task });
          setDialogOpen(true);
        }}
      >
        {/* 优先级颜色条 */}
        <div className={`h-1 -mx-3 -mt-3 mb-2 rounded-t-lg ${priority.color}`} />

        {/* 标题 */}
        <p className="text-sm font-medium text-text-primary line-clamp-2 mb-2">
          {task.title}
        </p>

        {/* 标签 */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            <span className={isOverdue ? "text-danger" : ""}>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("zh-CN") : "无截止"}
            </span>
          </span>
          {task.assignee && (
            <span
              className="flex items-center justify-center size-6 rounded-full bg-blue-100 text-blue-700 font-medium text-xs"
              title={task.assignee}
            >
              {task.assignee.charAt(0)}
            </span>
          )}
        </div>

        {/* 优先级标签 */}
        <span
          className={`inline-block text-[10px] px-1.5 py-0.5 rounded text-white mt-1.5 ${priority.color}`}
        >
          {priority.label}优先级
        </span>
      </div>

      {/* 编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑任务</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                标题 *
              </label>
              <Input
                value={editing.title}
                onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))}
                placeholder="任务标题"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                描述
              </label>
              <Input
                value={editing.description}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="任务描述"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                负责人
              </label>
              <Input
                value={editing.assignee}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, assignee: e.target.value }))
                }
                placeholder="负责人姓名"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                优先级
              </label>
              <Select
                value={editing.priority}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, priority: e.target.value as Task["priority"] }))
                }
                options={[
                  { value: "high", label: "高优先级" },
                  { value: "medium", label: "中优先级" },
                  { value: "low", label: "低优先级" },
                ]}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                截止日期
              </label>
              <Input
                type="date"
                value={editing.dueDate}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, dueDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1">
                标签（逗号分隔）
              </label>
              <Input
                value={editing.tags.join(", ")}
                onChange={(e) =>
                  setEditing((p) => ({
                    ...p,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="例如: 前端, 紧急"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("确定要删除这个任务吗？")) {
                  deleteTask(task.id);
                  setDialogOpen(false);
                }
              }}
            >
              <Trash2 className="size-3.5 mr-1" /> 删除
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={!editing.title.trim()}>
                保存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── 看板列组件 ───────────────────────────────────────

function KanbanColumn({
  column,
  onDrop,
  onDragStart,
}: {
  column: Column;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string, colId: string) => void;
}) {
  const { getTasksByColumn, updateColumn, deleteColumn, createTask } =
    useProjectStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const tasks = getTasksByColumn(column.id);

  const handleSaveTitle = () => {
    if (title.trim()) {
      updateColumn(column.id, { title: title.trim() });
    } else {
      setTitle(column.title);
    }
    setEditingTitle(false);
  };

  const handleQuickAdd = () => {
    if (!newTaskTitle.trim()) return;
    createTask({
      columnId: column.id,
      title: newTaskTitle.trim(),
      description: "",
      assignee: "",
      priority: "medium",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      tags: [],
    });
    setNewTaskTitle("");
    setAddingTask(false);
  };

  return (
    <div
      className="flex-shrink-0 w-72 bg-muted rounded-xl border flex flex-col max-h-full"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* 列头 */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between">
        {editingTitle ? (
          <Input
            className="h-7 text-sm font-semibold"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") {
                setTitle(column.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            className="text-sm font-semibold text-text-primary hover:text-text-primary/80 flex-1 text-left"
            onClick={() => setEditingTitle(true)}
          >
            {column.title}
          </button>
        )}
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-text-secondary bg-muted/70 rounded-full px-1.5 py-0.5">
            {tasks.length}
          </span>
          {column.order > 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-5"
              onClick={() => {
                if (confirm(`确定要删除「${column.title}」列及其所有任务吗？`)) {
                  deleteColumn(column.id);
                }
              }}
            >
              <X className="size-3 text-text-secondary hover:text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 min-h-[100px]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            columnId={column.id}
            onDragStart={onDragStart}
          />
        ))}
        {tasks.length === 0 && !addingTask && (
          <p className="text-xs text-text-secondary text-center py-4">
            拖放任务到此处
          </p>
        )}
      </div>

      {/* 快速添加任务 */}
      <div className="px-3 py-2 border-t">
        {addingTask ? (
          <div className="flex flex-col gap-1.5">
            <Input
              className="h-8 text-sm"
              placeholder="输入任务标题..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickAdd();
                if (e.key === "Escape") {
                  setAddingTask(false);
                  setNewTaskTitle("");
                }
              }}
              autoFocus
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={handleQuickAdd}
                disabled={!newTaskTitle.trim()}
              >
                添加
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  setAddingTask(false);
                  setNewTaskTitle("");
                }}
              >
                取消
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-text-secondary hover:text-text-primary"
            onClick={() => setAddingTask(true)}
          >
            <Plus className="size-3 mr-1" /> 添加任务
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── 看板主组件 ───────────────────────────────────────

interface KanbanBoardProps {
  projectId: string;
}

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const {
    getColumnsByProject,
    createColumn,
    moveTask,
  } = useProjectStore();
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  const columns = getColumnsByProject(projectId);

  // 拖拽状态
  const dragRef = useRef<{ taskId: string; sourceColId: string } | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent, taskId: string, colId: string) => {
      dragRef.current = { taskId, sourceColId: colId };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", taskId);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetColId: string) => {
      e.preventDefault();
      if (!dragRef.current) return;
      const { taskId, sourceColId } = dragRef.current;

      // 获取目标列中的任务数来确定 order
      const targetTasks = useProjectStore
        .getState()
        .tasks.filter((t) => t.columnId === targetColId)
        .sort((a, b) => a.order - b.order);

      const targetOrder = targetTasks.length;

      if (sourceColId !== targetColId) {
        moveTask(taskId, targetColId, targetOrder);
      }
      dragRef.current = null;
    },
    [moveTask]
  );

  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    createColumn(projectId, newColTitle.trim());
    setNewColTitle("");
    setAddingColumn(false);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 items-start h-full">
      {columns.length === 0 ? (
        <div className="flex-1 flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Layout className="size-12 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">暂无看板列</p>
            <p className="text-xs text-muted-foreground">点击下方按钮创建第一个列以开始管理任务</p>
          </div>
        </div>
      ) : (
        columns.map((col) => (
        <KanbanColumn
          key={col.id}
          column={col}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
      )))}

      {/* 添加列 */}
      <div className="flex-shrink-0 w-72">
        {addingColumn ? (
          <Card className="border-dashed">
            <CardContent className="p-3 space-y-2">
              <Input
                className="h-8 text-sm"
                placeholder="列名称..."
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") {
                    setAddingColumn(false);
                    setNewColTitle("");
                  }
                }}
                autoFocus
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAddColumn}
                  disabled={!newColTitle.trim()}
                >
                  添加
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setAddingColumn(false);
                    setNewColTitle("");
                  }}
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed h-10 text-sm text-gray-500 hover:text-gray-700"
            onClick={() => setAddingColumn(true)}
          >
            <Plus className="size-4 mr-1" /> 添加列
          </Button>
        )}
      </div>
    </div>
  );
}
