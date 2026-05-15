"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, CheckCircle2, Clock, XCircle, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useShoppingStore } from "./store";

export default function Dashboard() {
  const { dashboard, dashboardLoading, fetchDashboard } = useShoppingStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (dashboardLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-card" />
        ))}
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const cards = [
    {
      icon: ShoppingCart,
      label: "全部",
      value: dashboard.total_items,
      colorClass: "text-primary",
      bgClass: "bg-primary/10 dark:bg-primary/20",
    },
    {
      icon: CheckCircle2,
      label: "已购",
      value: dashboard.total_purchased,
      colorClass: "text-success",
      bgClass: "bg-success/10 dark:bg-success/20",
    },
    {
      icon: Clock,
      label: "待购",
      value: dashboard.total_pending,
      colorClass: "text-warning",
      bgClass: "bg-warning/10 dark:bg-warning/20",
    },
    {
      icon: XCircle,
      label: "取消",
      value: dashboard.total_cancelled,
      colorClass: "text-gray-400 dark:text-gray-500",
      bgClass: "bg-gray-50 dark:bg-gray-900/20",
    },
  ];

  const budgetCards = (dashboard.budgets || []).map((b) => ({
    name: b.name,
    spent: b.spent || 0,
    remaining: b.remaining || b.amount,
    percentage: b.percentage || 0,
    isOver: (b.spent || 0) > b.amount,
    amount: b.amount,
  }));

  return (
    <div className="space-y-6 mb-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgClass}`}>
                  <Icon className={`size-5 ${card.colorClass}`} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">{card.label}</p>
                  <p className="text-2xl font-bold text-text-primary">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Budget Overview */}
      {budgetCards.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3">预算概览</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetCards.map((b, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{b.name}</span>
                    <span className={`text-xs flex items-center gap-1 ${b.isOver ? "text-destructive" : "text-success"}`}>
                      {b.isOver ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {b.percentage.toFixed(0)}%
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>已花: ¥{b.spent.toFixed(2)}</span>
                    <span>预算: ¥{b.amount.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${
                        b.isOver ? "bg-destructive" : "bg-success"
                      }`}
                      style={{ width: `${Math.min(b.percentage, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs ${b.isOver ? "text-destructive" : "text-success"}`}>
                    {b.isOver
                      ? `超支 ¥${(b.spent - b.amount).toFixed(2)}`
                      : `剩余 ¥${b.remaining.toFixed(2)}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Total Spent */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-info/10 dark:bg-info/20">
            <DollarSign className="size-5 text-info" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">总花费</p>
            <p className="text-2xl font-bold text-text-primary">
              ¥{(dashboard.total_spent || 0).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
