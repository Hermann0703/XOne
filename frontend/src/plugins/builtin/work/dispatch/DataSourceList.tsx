"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Database,
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
import { useDispatchStore, type DataSource } from "./store";

// ─── 状态映射 ────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; variant: "success" | "default" | "destructive" }> = {
  active:   { label: "活跃",   variant: "success" },
  inactive: { label: "停用",   variant: "default" },
  error:    { label: "异常",   variant: "destructive" },
};

const SOURCE_TYPE_OPTIONS = [
  { value: "mysql",      label: "MySQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "oracle",     label: "Oracle" },
  { value: "sqlserver",  label: "SQL Server" },
  { value: "api",        label: "REST API" },
  { value: "csv",        label: "CSV 文件" },
  { value: "excel",      label: "Excel 文件" },
];

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || STATUS_MAP.inactive;
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}

// ─── 主组件 ──────────────────────────────────────────

export default function DataSourceList() {
  const {
    sources,
    loading,
    fetchSources,
    createSource,
    updateSource,
    deleteSource,
  } = useDispatchStore();

  // 搜索
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // 创建/编辑弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DataSource | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("mysql");
  const [formConfig, setFormConfig] = useState("{}");
  const [saving, setSaving] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<DataSource | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSources = useCallback(() => {
    const params: Record<string, unknown> = { page, size: pageSize };
    if (search) params.search = search;
    fetchSources(params);
  }, [page, search, fetchSources]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // 打开创建弹窗
  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormType("mysql");
    setFormConfig("{}");
    setDialogOpen(true);
  };

  // 打开编辑弹窗
  const openEdit = (source: DataSource) => {
    setEditing(source);
    setFormName(source.name);
    setFormType(source.source_type);
    setFormConfig(JSON.stringify(source.connection_config || {}, null, 2));
    setDialogOpen(true);
  };

  // 提交表单
  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(formConfig);
    } catch {
      config = {};
    }

    const data: Partial<DataSource> = {
      name: formName.trim(),
      source_type: formType,
      connection_config: config,
    };

    if (editing) {
      await updateSource(editing.id, data);
    } else {
      await createSource(data);
    }

    setSaving(false);
    setDialogOpen(false);
    loadSources();
  };

  // 删除
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteSource(deleteTarget.id);
    setDeleting(false);
    if (ok) {
      setDeleteTarget(null);
      loadSources();
    }
  };

  const totalPages = 1; // 简单分页

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">数据源管理</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" />
          新建数据源
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
            <Input
              placeholder="搜索数据源名称..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 数据表格 */}
      <Card>
        <CardHeader>
          <CardTitle>数据源列表</CardTitle>
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
                  <TableHead className="w-[120px]">类型</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
                  <TableHead className="w-[160px]">最近执行</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-text-secondary py-10">
                      暂无数据源，点击「新建数据源」创建
                    </TableCell>
                  </TableRow>
                ) : (
                  sources.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <Database className="size-3.5 text-text-secondary" />
                          {s.source_type}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {s.last_run_at || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-xs" title="编辑"
                            aria-label="编辑数据源"
                            onClick={() => openEdit(s)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" title="删除"
                            aria-label="删除数据源"
                            onClick={() => setDeleteTarget(s)}>
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
          <DialogTitle>{editing ? "编辑数据源" : "新建数据源"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label htmlFor="field-ds-name" className="block text-sm font-medium mb-1.5">数据源名称</label>
              <Input
                id="field-ds-name"
                placeholder="输入数据源名称"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="field-ds-type" className="block text-sm font-medium mb-1.5">数据源类型</label>
              <Select
                id="field-ds-type"
                options={SOURCE_TYPE_OPTIONS}
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="field-ds-config" className="block text-sm font-medium mb-1.5">连接配置 (JSON)</label>
              <Textarea
                id="field-ds-config"
                placeholder='{"host":"localhost","port":3306,"database":"test","username":"root","password":""}'
                className="font-mono text-xs min-h-[120px]"
                value={formConfig}
                onChange={(e) => setFormConfig(e.target.value)}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving || !formName.trim()}>
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
            确定要删除数据源「{deleteTarget?.name}」吗？此操作不可撤销，关联的任务将受到影响。
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
