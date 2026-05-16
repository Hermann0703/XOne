"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/api/client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Allocation {
  department_id: string;
  department_name: string;
  amount: number;
}

interface Props {
  contractId: number;
  contractAmount?: number;
  currency?: string;
}

const PIE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#f43f5e", "#06b6d4", "#f97316", "#6366f1",
];

export default function CostAllocationCard({ contractId, contractAmount, currency }: Props) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAllocations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet<Allocation[]>(`/work/contracts/${contractId}/allocations`);
      if (res.code === 0 && res.data) {
        setAllocations(res.data);
      } else {
        setAllocations([]);
      }
    } catch {
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const handleAmountChange = (index: number, value: string) => {
    const num = parseFloat(value);
    setAllocations((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, amount: isNaN(num) ? 0 : num } : item
      )
    );
  };

  const totalAmount = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  const amountMatch = contractAmount != null ? totalAmount === contractAmount : false;
  const amountDiff = contractAmount != null ? totalAmount - contractAmount : 0;

  const getRatio = (amount: number): string => {
    if (!contractAmount || contractAmount === 0) return "0.00";
    return ((amount / contractAmount) * 100).toFixed(2);
  };

  const pieData = allocations.map((alloc) => ({
    name: alloc.department_name,
    value: alloc.amount || 0,
    ratio: getRatio(alloc.amount),
  }));

  const handleSave = async () => {
    if (!amountMatch) return;
    try {
      setSaving(true);
      const payload = allocations.map((a) => ({
        department_id: a.department_id,
        amount: a.amount,
      }));
      await apiPost(`/work/contracts/${contractId}/allocations`, { allocations: payload });
      await fetchAllocations();
    } catch (err) {
      console.error("保存费用分摊失败", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">费用分摊</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 bg-bg-muted rounded animate-pulse" />
            <div className="h-8 bg-bg-muted rounded animate-pulse" />
            <div className="h-8 bg-bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">费用分摊</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            尚未设置费用分摊，请前往合同编辑页面选择分摊部门
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">费用分摊</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 左右布局：左表格 + 右饼图 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：分摊列表（占1/2） */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="text-left py-2 pr-4 font-medium">部门</th>
                  <th className="text-right py-2 px-4 font-medium w-40">
                    分摊金额
                    {currency && (
                      <span className="text-xs ml-1">({currency})</span>
                    )}
                  </th>
                  <th className="text-right py-2 px-4 font-medium w-28">分摊比例</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((alloc, index) => (
                  <tr key={alloc.department_id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{alloc.department_name}</td>
                    <td className="py-2 px-4">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={alloc.amount != null ? alloc.amount.toFixed(2) : ""}
                        onChange={(e) => handleAmountChange(index, e.target.value)}
                        className="h-8 text-right text-sm"
                      />
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums">
                      {getRatio(alloc.amount)}%
                    </td>
                  </tr>
                ))}
                {/* 合计行 */}
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-2 pr-4">合计</td>
                  <td className="py-2 px-4 text-right tabular-nums">
                    <span className={amountMatch ? "" : "text-red-500"}>
                      {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {!amountMatch && (
                        <span className="ml-1 text-xs">
                          ({amountDiff > 0 ? "+" : ""}{amountDiff.toFixed(2)})
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className={amountMatch ? "text-emerald-500" : "text-red-500"}>
                      {amountMatch ? "100.00%" : `${getRatio(totalAmount)}%`}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 保存按钮 */}
            <div className="flex justify-end mt-3">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!amountMatch || saving}
              >
                {saving ? "保存中..." : "保存分摊"}
              </Button>
            </div>
          </div>

          {/* 右侧：饼状图（占1/2） */}
          <div className="flex items-center justify-center">
            {pieData.every((d) => d.value === 0) ? (
              <p className="text-sm text-text-secondary">请填写分摊金额后查看图表</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="35%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ percent }) =>
                      `${((percent ?? 0) * 100).toFixed(1)}%`
                    }
                    labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        stroke="var(--bg-card, #fff)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const num = typeof value === "number" ? value : 0;
                      return [
                        `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ""}`,
                        name,
                      ];
                    }}
                    contentStyle={{
                      backgroundColor: "var(--bg-card, #fff)",
                      border: "1px solid var(--border, #e2e8f0)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingLeft: "16px" }}
                    formatter={(value: string) => (
                      <span style={{ color: "var(--text-secondary, #64748b)", fontSize: "12px" }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
