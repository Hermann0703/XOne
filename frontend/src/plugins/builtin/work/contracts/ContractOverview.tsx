"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractStore } from "./store";

// ─── 金额格式化 ──────────────────────────────────────

function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return "--";
  return `¥${amount.toLocaleString("zh-CN")} 元`;
}

function formatPercent(rate: number | null | undefined): string {
  if (rate == null) return "--";
  return `${(rate * 100).toFixed(1)}%`;
}

// ─── 主组件 ──────────────────────────────────────────

export default function ContractOverview() {
  const { dashboard, fetchDashboard } = useContractStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false));
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  const s = dashboard?.summary;
  const p = dashboard?.performance;
  const expiring = dashboard?.expiring_soon || [];

  const summaryCards = [
    {
      label: "合同总数",
      value: s?.total_contracts ?? "--",
      icon: <FileText className="size-5 text-primary" />,
    },
    {
      label: "合同总金额",
      value: s?.total_amount != null ? formatAmount(s.total_amount) : "--",
      icon: <DollarSign className="size-5 text-success" />,
    },
    {
      label: "生效中",
      value: s?.active_count ?? "--",
      icon: <TrendingUp className="size-5 text-success" />,
    },
    {
      label: "已完成",
      value: s?.completed_count ?? "--",
      icon: <CheckCircle2 className="size-5 text-success" />,
    },
    {
      label: "草稿",
      value: s?.draft_count ?? "--",
      icon: <Clock className="size-5 text-warning" />,
    },
    {
      label: "已终止",
      value: s?.terminated_count ?? "--",
      icon: <AlertTriangle className="size-5 text-destructive" />,
    },
  ];

  const milestoneRate =
    p && p.total_milestones > 0
      ? (p.completed_milestones / p.total_milestones) * 100
      : 0;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-text-primary">总体情况</h1>

      {/* 统计卡片 */}
      {s ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {summaryCards.map((card, i) => (
            <Card key={i} className="bg-card border rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">
                  {card.label}
                </CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border rounded-xl">
          <CardContent className="pt-6 text-center text-text-secondary py-10">
            暂无统计数据
          </CardContent>
        </Card>
      )}

      {/* 履约情况 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              履约情况
            </CardTitle>
          </CardHeader>
          <CardContent>
            {p ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">按时履约率</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatPercent(p.on_time_rate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">逾期数量</span>
                  <Badge
                    variant="outline"
                    className={
                      p.overdue_count > 0
                        ? "bg-red-100 text-red-700 border-red-300"
                        : "bg-green-100 text-green-700 border-green-300"
                    }
                  >
                    {p.overdue_count} 个
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">里程碑完成进度</span>
                    <span className="font-medium">
                      {p.completed_milestones} / {p.total_milestones}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(milestoneRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-text-secondary py-6">
                暂无履约数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 到期预警 */}
        <Card className="bg-card border rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              到期预警
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiring.length > 0 ? (
              <div className="space-y-3 max-h-[260px] overflow-y-auto">
                {expiring.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" title={item.contract_name}>
                        {item.contract_name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {item.contract_no} · 到期: {item.end_date}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={
                          item.days_left <= 7
                            ? "bg-red-100 text-red-700 border-red-300"
                            : item.days_left <= 30
                            ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                            : "bg-blue-100 text-blue-700 border-blue-300"
                        }
                      >
                        {item.days_left <= 0
                          ? "已逾期"
                          : `剩余 ${item.days_left} 天`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-text-secondary py-6">
                暂无即将到期的合同
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
