"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { DollarSign, ArrowUpCircle, ArrowDownCircle, TrendingUp, Wallet } from "lucide-react"

const API_BASE = "http://localhost:8000/api/v1/personal"

interface DashboardData {
  net_worth: number
  monthly_income: number
  monthly_expense: number
  monthly_balance: number
  accounts: AccountSummary[]
  monthly_trend: MonthlyTrend[]
  recent_transactions: RecentTransaction[]
}

interface AccountSummary {
  id: number
  name: string
  balance: number
  type: string
  color?: string
  currency: string
}

interface MonthlyTrend {
  month: string
  income: number
  expense: number
}

interface RecentTransaction {
  id: number
  date: string
  type: string
  category: string
  amount: number
  account_name?: string
}

export default function AssetsDashboard() {
  const t = useTranslations()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${API_BASE}/assets/dashboard`)
        const json = await res.json()
        setData(json.data ?? json)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  function formatCurrency(val: number, currency?: string) {
    const sym = currency === "CNY" ? "¥" : "$"
    return `${sym}${val.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  function typeLabel(typ: string) {
    const map: Record<string, string> = {
      bank: t("assets.accountType.bank"),
      cash: t("assets.accountType.cash"),
      credit: t("assets.accountType.credit"),
      investment: t("assets.accountType.investment"),
      other: t("assets.accountType.other"),
    }
    return map[typ] ?? typ
  }

  function typeColor(typ: string) {
    const map: Record<string, string> = {
      bank: "bg-blue-500",
      cash: "bg-green-500",
      credit: "bg-purple-500",
      investment: "bg-orange-500",
      other: "bg-gray-500",
    }
    return map[typ] ?? "bg-gray-400"
  }

  function txTypeBadge(typ: string) {
    if (typ === "income")
      return <Badge variant="success">{t("assets.txType.income")}</Badge>
    if (typ === "expense")
      return <Badge variant="destructive">{t("assets.txType.expense")}</Badge>
    return <Badge variant="secondary">{t("assets.txType.transfer")}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              {t("assets.kpi.netWorth")}
            </CardTitle>
            <DollarSign className="size-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data ? formatCurrency(data.net_worth) : "--"}
            </div>
            <p className="text-xs text-text-secondary">{t("assets.kpi.netWorthDesc")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              {t("assets.kpi.monthlyIncome")}
            </CardTitle>
            <ArrowUpCircle className="size-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data ? formatCurrency(data.monthly_income) : "--"}
            </div>
            <p className="text-xs text-text-secondary">{t("assets.kpi.thisMonth")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              {t("assets.kpi.monthlyExpense")}
            </CardTitle>
            <ArrowDownCircle className="size-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data ? formatCurrency(data.monthly_expense) : "--"}
            </div>
            <p className="text-xs text-text-secondary">{t("assets.kpi.thisMonth")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              {t("assets.kpi.monthlyBalance")}
            </CardTitle>
            <TrendingUp className="size-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data && data.monthly_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {data ? formatCurrency(data.monthly_balance) : "--"}
            </div>
            <p className="text-xs text-text-secondary">{t("assets.kpi.thisMonth")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Summary Cards */}
      {data && data.accounts && data.accounts.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Wallet className="size-4 text-primary" />
            {t("assets.accounts")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.accounts.map((acct) => (
              <Card key={acct.id} className="overflow-hidden">
                <div className={`h-1 ${typeColor(acct.type)}`} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {acct.name}
                    <Badge variant="outline" className="text-[10px]">
                      {typeLabel(acct.type)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {formatCurrency(acct.balance, acct.currency)}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {acct.currency}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Charts + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("assets.monthlyTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.monthly_trend && data.monthly_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                  />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name={t("assets.txType.income")}
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name={t("assets.txType.expense")}
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">
                {t("common.empty")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("assets.recentTransactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.recent_transactions && data.recent_transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("assets.tx.date")}</TableHead>
                    <TableHead>{t("assets.tx.type")}</TableHead>
                    <TableHead>{t("assets.tx.category")}</TableHead>
                    <TableHead className="text-right">{t("assets.tx.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">{tx.date}</TableCell>
                      <TableCell>{txTypeBadge(tx.type)}</TableCell>
                      <TableCell className="text-xs">{tx.category}</TableCell>
                      <TableCell
                        className={`text-right text-sm font-medium ${
                          tx.type === "income"
                            ? "text-green-600"
                            : tx.type === "expense"
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">
                {t("common.empty")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
