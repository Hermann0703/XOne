"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface MonthlyTrend {
  month: string
  income: number
  expense: number
}

interface Props {
  data: MonthlyTrend[]
  formatCurrency: (val: number) => string
  incomeLabel: string
  expenseLabel: string
  emptyLabel: string
}

export default function MonthlyTrendChart({ data, formatCurrency, incomeLabel, expenseLabel, emptyLabel }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">
        {emptyLabel}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
        <Legend />
        <Bar dataKey="income" name={incomeLabel} fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name={expenseLabel} fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
