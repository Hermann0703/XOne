"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Play,
  Clock,
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
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useDispatchStore, type DispatchTask, type DataSource } from "./store";

// ─── 状态映射 ────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  active: { label: "活跃",   variant: "success" },
  paused: { label: "暂停",   variant: "warning" },
  error:  { label: "异常",   variant: "destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || STATUS_MAP.paused;
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}

// ─── 主组件 ──────────────────────────────────────────

export default function TaskList() {
  const {
    tasks,
    sources,
    loading,
    fetchTasks,
    fetchSources,
    createTask,
    updateTask,
    deleteTask,
    executeTask,
  } = useDispatchStore();

  // 筛选条件
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // 创建/编辑弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DispatchTask | null>(null);
  const [formName, setFormName] = useState("");
  const [formSourceId, setFormSourceId] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formTargetTable, setFormTargetTable] = useState("");
  const [formQuerySql, setFormQuerySql] = useState("");
  const [formEndpointUrl, setFormEndpointUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<DispatchTask | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 执行中状态
  const [executingId, setExecutingId] = useState<number | null>(null);

  const loadTasks = useCallback(() => {
    const params: Record<string, unknown> = { page, size: pageSize };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    fetchTasks(params);
  }, [page, search, statusFilter, fetchTasks]);

  useEffect(() => {
    loadTasks();
    fetchSources();
  }, [loadTasks, fetchSources]);

  // 打开创建弹窗
  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormSourceId(sources[0] ? String(sources[0].id) : "");
    setFormSchedule("");
    setFormTargetTable("");
    setFormQuerySql("");
    setFormEndpointUrl("");
    setDialogOpen(true);
  };

  // 打开编辑弹窗
  const openEdit = (task: DispatchTask) => {
    setEditing(task);
    setFormName(task.name);
    setFormSourceId(String(task.data_source_id));
    setFormSchedule(task.schedule || "");
    setFormTargetTable(task.target_table || "");
    setFormQuerySql(task.query_sql || "");
    setFormEndpointUrl(task.endpoint_url || "");
    setDialogOpen(true);
  };

  // 提交表单
  const handleSave = async () => {
    if (!formName.trim() || !formSourceId) return;
    setSaving(true);

    const data: Partial<DispatchTask> = {
      name: formName.trim(),
      data_source_id: Number(formSourceId),
      schedule: formSchedule.trim() || undefined,
      target_table: formTargetTable.trim() || undefined,
      query_sql: formQuerySql.trim() || undefined,
      endpoint_url: formEndpointUrl.trim() || undefined,
    };

    if (editing) {
      await updateTask(editing.id, data);
    } else {
      await createTask(data);
    }

    setSaving(false);
    setDialogOpen(false);
    loadTasks();
  };

  // 删除
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteTask(deleteTarget.id);
    setDeleting(false);
    if (ok) {
      setDeleteTarget(null);
      loadTasks();
    }
  };

  // 手动执行
  const handleExecute = async (task: DispatchTask) => {
    setExecutingId(task.id);
    const ok = await executeTask(task.id);
    setExecutingId(null);
    if (ok) {
      loadTasks();
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">任务管理</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          新建任务
        </Button>
      </div>

      {/* 搜索筛选栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
              <Input
                placeholder="搜索任务名称..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <Select
              options={[
                { value: "",     label: "全部状态" },
                { value: "active", label: "活跃" },
                { value: "paused", label: "暂停" },
                { value: "error",  label: "异常" },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              placeholder="状态筛选"
            />
          </div>
        </CardContent>
      </Card>

      {/* 数据表格 */}
      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead className="w-[140px]">数据源</TableHead>
                  <TableHead className="w-[120px]">调度规则</TableHead>
                  <TableHead className="w-[80px]">状态</TableHead>
                  <TableHead className="w-[140px]">下次执行</TableHead>
                  <TableHead className="w-[140px]">最近执行</TableHead>
                  <TableHead className="w-[160px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-secondary py-10">
                      暂无任务数据
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-sm">{t.data_source_name || "-"}</TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3 text-text-secondary" />
                          {t.schedule || "手动"}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {t.next_run_at || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {t.last_run_at || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-xs" title="手动执行"
                            disabled={executingId === t.id}
                            onClick={() => handleExecute(t)}>
                            <Play className={`size-3.5 ${executingId === t.id ? "animate-spin" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon-xs" title="编辑"
                            onClick={() => openEdit(t)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" title="删除"
                            onClick={() => setDeleteTarget(t)}>
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑任务" : "新建任务"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">任务名称</label>
              <Input
                placeholder="输入任务名称"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">数据源</label>
              <Select
                options={sources.map((s) => ({ value: String(s.id), label: s.name }))}
                value={formSourceId}
                onChange={(e) => setFormSourceId(e.target.value)}
                placeholder="选择数据源"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">调度规则 (cron 表达式)</label>
              <Input
                placeholder="如: 0 2 * * * (每天凌晨2点)"
                value={formSchedule}
                onChange={(e) => setFormSchedule(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">目标表</label>
              <Input
                placeholder="数据写入的目标表名"
                value={formTargetTable}
                onChange={(e) => setFormTargetTable(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">查询 SQL</label>
              <Textarea
                placeholder="SELECT * FROM source_table WHERE updated_at > :last_run"
                className="font-mono text-xs min-h-[80px]"
                value={formQuerySql}
                onChange={(e) => setFormQuerySql(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">接口地址 (API数据源时使用)</label>
              <Input
                placeholder="https://api.example.com/data"
                value={formEndpointUrl}
                onChange={(e) => setFormEndpointUrl(e.target.value)}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving || !formName.trim() || !formSourceId}>
            {saving ? "保存中..." : editing ? "保存修改" : "创建"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-text-secondary">
            确定要删除任务「{deleteTarget?.name}」吗？此操作不可撤销。
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "删除中..." : "确认删除"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
