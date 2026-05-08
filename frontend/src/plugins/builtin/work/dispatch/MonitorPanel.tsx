"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Database,
  ListChecks,
  Play,
  Target,
  RefreshCw,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDispatchStore } from "./store";

// ─── 统计卡片 ────────────────────────────────────────

function SummaryCards() {
  const { monitoring, fetchMonitoring } = useDispatchStore();

  useEffect(() => {
    fetchMonitoring();
  }, [fetchMonitoring]);

  const cards = [
    {
      label: "活跃数据源",
      value: monitoring.active_sources ?? "--",
      icon: <Database className="size-5 text-blue-500" />,
    },
    {
      label: "活跃任务",
      value: monitoring.active_tasks ?? "--",
      icon: <ListChecks className="size-5 text-green-500" />,
    },
    {
      label: "今日执行",
      value: monitoring.today_executions ?? "--",
      icon: <Play className="size-5 text-orange-500" />,
    },
    {
      label: "成功率",
      value: monitoring.success_rate != null ? `${(monitoring.success_rate * 100).toFixed(1)}%` : "--",
      icon: <Target className="size-5 text-emerald-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
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

// ─── 日志状态徽章 ────────────────────────────────────

function LogStatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return <Badge variant="success">成功</Badge>;
  }
  if (status === "failed") {
    return <Badge variant="destructive">失败</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

// ─── 主组件 ──────────────────────────────────────────

export default function MonitorPanel() {
  const { logs, loading, fetchLogs, fetchMonitoring } = useDispatchStore();

  const [taskIdFilter, setTaskIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const loadData = useCallback(() => {
    const params: Record<string, unknown> = { page, size: pageSize };
    if (taskIdFilter) params.task_id = taskIdFilter;
    fetchLogs(params);
    fetchMonitoring();
  }, [page, taskIdFilter, fetchLogs, fetchMonitoring]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 自动刷新 30 秒
  useEffect(() => {
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, [loadData]);

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">监控面板</h1>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="size-4 mr-1" />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <SummaryCards />

      {/* 日志过滤 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1.5">按任务 ID 过滤</label>
              <Input
                placeholder="输入任务 ID..."
                value={taskIdFilter}
                onChange={(e) => { setTaskIdFilter(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志表格 */}
      <Card>
        <CardHeader>
          <CardTitle>执行日志</CardTitle>
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
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="w-[120px]">任务名称</TableHead>
                  <TableHead className="w-[120px]">数据源</TableHead>
                  <TableHead className="w-[80px]">状态</TableHead>
                  <TableHead>消息</TableHead>
                  <TableHead className="w-[80px]">影响行数</TableHead>
                  <TableHead className="w-[80px]">耗时(ms)</TableHead>
                  <TableHead className="w-[160px]">执行时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-text-secondary py-10">
                      暂无执行日志
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">{log.id}</TableCell>
                      <TableCell className="text-sm">{log.task_name || "-"}</TableCell>
                      <TableCell className="text-sm">{log.data_source_name || "-"}</TableCell>
                      <TableCell><LogStatusBadge status={log.status} /></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate" title={log.message}>
                        {log.message || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {log.rows_affected ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {log.duration_ms ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {log.created_at || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
