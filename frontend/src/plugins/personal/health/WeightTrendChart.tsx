"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface WeightTrend {
  date: string
  weight: number
}

interface Props {
  data: WeightTrend[]
  emptyLabel: string
}

export default function WeightTrendChart({ data, emptyLabel }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-text-secondary text-sm">
        {emptyLabel}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="weight" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
