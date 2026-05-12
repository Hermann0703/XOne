"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
  TrendingUp,
  Clock,
  AlertTriangle,
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractStore, type Contract } from "./store";

// ─── 类型映射 ────────────────────────────────────────

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  purchase: '采购合同',
  sale: '销售合同',
  service: '服务合同',
  lease: '租赁合同',
  loan: '借款合同',
  other: '其他',
};

// ─── 状态映射 ────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft:        { label: "草稿",   className: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600" },
  signed:       { label: "已签署", className: "bg-blue-100 text-blue-700 border-blue-300" },
  in_progress:  { label: "履行中", className: "bg-green-100 text-green-700 border-green-300" },
  completed:    { label: "已完成", className: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  terminated:   { label: "已终止", className: "bg-red-100 text-red-700 border-red-300" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1 ${config.className}`}>
      <span className={`size-1.5 rounded-full ${status === "draft" ? "bg-gray-500" : status === "signed" ? "bg-blue-500" : status === "in_progress" ? "bg-green-500" : status === "completed" ? "bg-emerald-500" : "bg-red-500"}`} />
      {config.label}
    </Badge>
  );
}

// ─── 仪表盘卡片 ──────────────────────────────────────

function DashboardCards() {
  const { dashboard, fetchDashboard, fonds, fetchFonds } = useContractStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchFonds()]).finally(() => setLoading(false));
  }, [fetchDashboard, fetchFonds]);

  const cards = [
    { label: "合同总数", value: dashboard?.summary?.total_contracts ?? "--", icon: <FileText className="size-5 text-blue-500" /> },
    { label: "生效中",   value: dashboard?.summary?.active_count ?? "--", icon: <TrendingUp className="size-5 text-green-500" /> },
    { label: "已完成",   value: dashboard?.summary?.completed_count ?? "--", icon: <Clock className="size-5 text-orange-500" /> },
    { label: "即将到期", value: dashboard?.expiring_soon?.length ?? "--", icon: <AlertTriangle className="size-5 text-red-500" /> },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {loading
        ? [1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        : cards.map((c, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">{c.label}</CardTitle>
                {c.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          ))}
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────

export default function ContractList() {
  const router = useRouter();
  const t = useTranslations();
  const {
    contracts,
    paging,
    loading,
    fonds,
    fetchContracts,
    deleteContract,
  } = useContractStore();

  // 筛选条件
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fondsFilter, setFondsFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadContracts = useCallback(() => {
    const params: Record<string, unknown> = { page, size: pageSize };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.contract_type = typeFilter;
    if (fondsFilter) params.fonds_id = fondsFilter;
    fetchContracts(params);
  }, [page, search, statusFilter, typeFilter, fondsFilter, fetchContracts]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteContract(deleteTarget.id);
    setDeleting(false);
    if (ok) {
      setDeleteTarget(null);
      loadContracts();
    }
  };

  const totalPages = paging ? Math.ceil(paging.total / pageSize) : 1;

  return (
    <div className="space-y-6 p-6">
      {/* 操作区 */}
      <div className="flex items-center justify-end">
        <Button onClick={() => router.push("/work/contracts/new")}>
          <Plus className="size-4 mr-1" />
          新建合同
        </Button>
      </div>

      {/* 仪表盘 */}
      <DashboardCards />

      {/* 搜索筛选栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
              <Input
                placeholder="搜索合同编号或合同名称..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <Select
              options={[
                { value: "", label: "全部全宗" },
                ...fonds.map((f) => ({ value: String(f.id), label: f.name })),
              ]}
              value={fondsFilter}
              onChange={(e) => { setFondsFilter(e.target.value); setPage(1); }}
              placeholder="全宗筛选"
            />

            <Select
              options={[
                { value: "", label: "全部状态" },
                { value: "draft", label: "草稿" },
                { value: "signed", label: "已签署" },
                { value: "in_progress", label: "履行中" },
                { value: "completed", label: "已完成" },
                { value: "terminated", label: "已终止" },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              placeholder="状态筛选"
            />

            <Select
              options={[
                { value: "", label: "全部类型" },
                { value: "purchase", label: "采购合同" },
                { value: "sale", label: "销售合同" },
                { value: "service", label: "服务合同" },
                { value: "lease", label: "租赁合同" },
                { value: "loan", label: "借款合同" },
                { value: "other", label: "其他" },
              ]}
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              placeholder="类型筛选"
            />
          </div>
        </CardContent>
      </Card>

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
                    <TableHead className="w-[120px]">合同编号</TableHead>
                    <TableHead>合同名称</TableHead>
                    <TableHead className="w-[120px]">需求编号</TableHead>
                    <TableHead className="w-[120px]">供应商</TableHead>
                    <TableHead>标的名称</TableHead>
                    <TableHead className="w-[100px]">采购金额</TableHead>
                    <TableHead className="w-[80px]">状态</TableHead>
                    <TableHead className="w-[120px]">生命周期</TableHead>
                    <TableHead className="w-[100px]">签署日期</TableHead>
                    <TableHead className="w-[80px]">类型</TableHead>
                    <TableHead className="w-[120px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="py-10">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                            <FileText className="w-7 h-7 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-lg font-medium text-foreground">{t("contracts.empty.title")}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t("contracts.empty.description")}</p>
                          </div>
                          <Button onClick={() => router.push(`/work/contracts/new`)} className="gap-1.5">
                            <Plus className="w-4 h-4" />
                            {t("contracts.empty.cta")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    contracts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">{c.contract_no}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={c.contract_name}>{c.contract_name}</TableCell>
                        <TableCell className="font-mono text-sm">{c.requirement_no || "-"}</TableCell>
                        <TableCell>{c.supplier || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={c.subject_name}>{c.subject_name || "-"}</TableCell>
                        <TableCell className="text-right">
                          {c.amount != null ? `${c.currency || "CNY"} ${c.amount.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                        <TableCell>
                          {c.lifecycle_template_name ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium leading-tight">{c.lifecycle_template_name}</span>
                              {c.lifecycle_stage_name && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 leading-tight h-auto">
                                  {c.lifecycle_stage_name}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{c.sign_date || "-"}</TableCell>
                        <TableCell className="text-sm">{c.contract_type ? (CONTRACT_TYPE_LABELS[c.contract_type] || c.contract_type) : "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon-xs" title="查看详情" aria-label="查看合同详情"
                              onClick={() => router.push(`/work/contracts/${c.id}`)}>
                              <Eye className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" title="编辑" aria-label="编辑合同"
                              onClick={() => router.push(`/work/contracts/${c.id}/edit`)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" title="删除" aria-label="删除合同"
                              onClick={() => setDeleteTarget(c)}>
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* 分页器 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-text-secondary">
                    共 {paging?.total ?? 0} 条记录
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      上一页
                    </Button>
                    <span className="text-sm px-2">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 删除确认弹窗 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除合同「{deleteTarget?.contract_name}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
