"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Upload,
  Trash2,
  RefreshCw,
  FileText,
  Plus,
  Database,
  HardDrive,
  Layers,
  Loader2,
  CheckSquare,
  Square,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useKnowledgeStore, type KnowledgeDocument } from "./store";

// ─── 状态映射 ────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  processing: {
    label: "处理中",
    className: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
  ready: {
    label: "就绪",
    className: "bg-green-100 text-green-700 border-green-300",
  },
  error: {
    label: "错误",
    className: "bg-red-100 text-red-700 border-red-300",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || STATUS_MAP.processing;
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 ${config.className}`}
    >
      <span
        className={`size-1.5 rounded-full ${
          status === "processing"
            ? "bg-yellow-500"
            : status === "ready"
            ? "bg-green-500"
            : "bg-red-500"
        }`}
      />
      {config.label}
    </Badge>
  );
}

// ─── 文件类型映射 ────────────────────────────────────

const FILE_TYPE_MAP: Record<string, { label: string; className: string }> = {
  pdf: { label: "PDF", className: "bg-blue-100 text-blue-700 border-blue-300" },
  docx: {
    label: "DOCX",
    className: "bg-blue-100 text-blue-700 border-blue-300",
  },
  txt: { label: "TXT", className: "bg-gray-100 text-gray-700 border-gray-300" },
  md: {
    label: "MD",
    className: "bg-purple-100 text-purple-700 border-purple-300",
  },
  webpage: {
    label: "网页",
    className: "bg-cyan-100 text-cyan-700 border-cyan-300",
  },
};

function FileTypeBadge({ fileType }: { fileType: string }) {
  const config = FILE_TYPE_MAP[fileType] || {
    label: fileType.toUpperCase(),
    className: "bg-gray-100 text-gray-700 border-gray-300",
  };
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 ${config.className}`}
    >
      <FileText className="size-3" />
      {config.label}
    </Badge>
  );
}

// ─── 格式化函数 ──────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatSize(bytes?: number): string {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── 统计卡片 ────────────────────────────────────────

function StatsCards() {
  const { stats, fetchStats } = useKnowledgeStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
  }, [fetchStats]);

  const items = [
    {
      label: "文档总数",
      value: stats?.total_documents ?? "--",
      icon: <FileText className="size-5 text-blue-500" />,
    },
    {
      label: "分块总数",
      value: stats?.total_chunks ?? "--",
      icon: <Layers className="size-5 text-purple-500" />,
    },
    {
      label: "存储总量",
      value: formatSize(stats?.total_size),
      icon: <HardDrive className="size-5 text-green-500" />,
    },
    {
      label: "知识库",
      value: "向量检索",
      icon: <Database className="size-5 text-orange-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {loading
        ? items.map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        : items.map((item, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </CardTitle>
                {item.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
              </CardContent>
            </Card>
          ))}
    </div>
  );
}

// ─── 上传对话框 ──────────────────────────────────────

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const { uploadDocument } = useKnowledgeStore();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);
    if (tags.trim()) formData.append("tags", tags.trim());
    if (sourceUrl.trim()) formData.append("source_url", sourceUrl.trim());

    const result = await uploadDocument(formData);
    setUploading(false);
    if (result) {
      setFile(null);
      setTitle("");
      setTags("");
      setSourceUrl("");
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setTags("");
    setSourceUrl("");
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上传文档</DialogTitle>
          <DialogDescription>
            支持 PDF、DOCX、TXT、Markdown 格式，最大 50MB
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* 文件选择 */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              选择文件
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                已选择: {file.name} ({formatSize(file.size)})
              </p>
            )}
          </div>
          {/* 标题 */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              文档标题
            </label>
            <Input
              placeholder={file?.name || "请输入文档标题"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          {/* 标签 */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              标签 (逗号分隔)
            </label>
            <Input
              placeholder="例如: 合同, 技术文档, 2024"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          {/* 来源链接 */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              来源链接 (可选)
            </label>
            <Input
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetForm} disabled={uploading}>
            重置
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading && <Loader2 className="size-4 mr-2 animate-spin" />}
            上传
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 确认删除对话框 ──────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 主页面组件 ──────────────────────────────────────

export default function DocumentList() {
  const router = useRouter();
  const {
    documents,
    loading,
    searchQuery,
    fetchDocuments,
    deleteDocument,
    batchDelete,
    reindexDocument,
    searchDocuments,
  } = useKnowledgeStore();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteOneId, setDeleteOneId] = useState<number | null>(null);
  const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 初始加载
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      searchDocuments(searchQuery.trim());
    } else {
      fetchDocuments();
    }
  }, [searchQuery, searchDocuments, fetchDocuments]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // 单个删除
  const handleDeleteOne = async () => {
    if (deleteOneId === null) return;
    setActionLoading(true);
    await deleteDocument(deleteOneId);
    setActionLoading(false);
    setDeleteOneId(null);
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    const ids = Array.from(selectedIds);
    await batchDelete(ids);
    setSelectedIds(new Set());
    setActionLoading(false);
    setDeleteBatchOpen(false);
  };

  // 重建索引
  const handleReindex = async (id: number) => {
    await reindexDocument(id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">知识库</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理知识文档与 RAG 智能问答
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="size-4 mr-2" />
          上传文档
        </Button>
      </div>

      {/* 统计卡片 */}
      <StatsCards />

      {/* 搜索与工具栏 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="搜索文档标题..."
            value={searchQuery}
            onChange={(e) => {
              useKnowledgeStore.getState().setSearchQuery(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          搜索
        </Button>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            onClick={() => setDeleteBatchOpen(true)}
          >
            <Trash2 className="size-4 mr-2" />
            批量删除 ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* 文档表格 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="size-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">暂无文档</p>
              <p className="text-sm mt-1">点击「上传文档」添加知识库内容</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="inline-flex items-center justify-center hover:text-foreground text-muted-foreground"
                    >
                      {selectedIds.size === documents.length &&
                      documents.length > 0 ? (
                        <CheckSquare className="size-4" />
                      ) : (
                        <Square className="size-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead className="w-24">类型</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  <TableHead className="w-24">分块数</TableHead>
                  <TableHead className="w-36">创建时间</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <button
                        onClick={() => toggleSelect(doc.id)}
                        className="inline-flex items-center justify-center hover:text-foreground text-muted-foreground"
                      >
                        {selectedIds.has(doc.id) ? (
                          <CheckSquare className="size-4" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate max-w-[300px]">
                          {doc.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <FileTypeBadge fileType={doc.file_type} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      {doc.chunk_count ?? "--"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="重建索引"
                          onClick={() => handleReindex(doc.id)}
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="删除"
                          onClick={() => setDeleteOneId(doc.id)}
                        >
                          <Trash2 className="size-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 上传对话框 */}
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      {/* 单个删除确认 */}
      <ConfirmDialog
        open={deleteOneId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteOneId(null);
        }}
        title="确认删除"
        description="删除后文档及其所有分块数据将被永久移除，此操作不可恢复。"
        onConfirm={handleDeleteOne}
        loading={actionLoading}
      />

      {/* 批量删除确认 */}
      <ConfirmDialog
        open={deleteBatchOpen}
        onOpenChange={setDeleteBatchOpen}
        title="批量删除"
        description={`确定要删除选中的 ${selectedIds.size} 个文档吗？删除后数据不可恢复。`}
        onConfirm={handleBatchDelete}
        loading={actionLoading}
      />
    </div>
  );
}
