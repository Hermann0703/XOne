"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp, Ruler, Weight, Percent, Activity } from "lucide-react"

const API_BASE = "http://localhost:8000/api/v1/personal"

interface BodyMetric {
  id: number
  date: string
  weight: number
  height: number
  bmi: number
  body_fat: number
  waist: number
}

export default function BodyMetricsDashboard() {
  const t = useTranslations()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<BodyMetric[]>([])
  const [latest, setLatest] = useState<BodyMetric | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ weight: "", height: "", body_fat: "", waist: "" })

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/health/body-metrics?limit=30`)
        const data = await res.json()
        const list: BodyMetric[] = data.data ?? []
        setMetrics(list)
        if (list.length > 0) setLatest(list[0])
      } catch {
        setMetrics([])
        setLatest(null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  async function handleSubmit() {
    try {
      await fetch(`${API_BASE}/health/body-metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: Number(form.weight),
          height: Number(form.height),
          body_fat: Number(form.body_fat) || undefined,
          waist: Number(form.waist) || undefined,
        }),
      })
      setDialogOpen(false)
      setForm({ weight: "", height: "", body_fat: "", waist: "" })
      // Refetch
      const res = await fetch(`${API_BASE}/health/body-metrics?limit=30`)
      const data = await res.json()
      const list: BodyMetric[] = data.data ?? []
      setMetrics(list)
      if (list.length > 0) setLatest(list[0])
    } catch {
      // handle error
    }
  }

  const statCards = [
    { label: t("health.metrics.weight"), value: latest?.weight ?? "--", unit: "kg", icon: <Weight className="size-5 text-primary" /> },
    { label: t("health.metrics.height"), value: latest?.height ?? "--", unit: "cm", icon: <Ruler className="size-5 text-success" /> },
    { label: "BMI", value: latest?.bmi?.toFixed(1) ?? "--", unit: "", icon: <TrendingUp className="size-5 text-info" /> },
    { label: t("health.metrics.bodyFat"), value: latest?.body_fat ?? "--", unit: "%", icon: <Percent className="size-5 text-warning" /> },
    { label: t("health.metrics.waist"), value: latest?.waist ?? "--", unit: "cm", icon: <Activity className="size-5 text-destructive" /> },
  ]

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 rounded-card" />)}
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stats Cards */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("health.bodyMetrics")}</h2>
        <Button onClick={() => setDialogOpen(true)}>{t("health.metrics.record")}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-text-secondary">{stat.label}</span>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stat.value}</div>
              {stat.unit && <p className="text-xs text-text-secondary">{stat.unit}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("health.metrics.trend")}</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={[...metrics].reverse()}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="weight" name={t("health.metrics.weight")} stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 2 }} />
                <Line yAxisId="right" type="monotone" dataKey="body_fat" name={t("health.metrics.bodyFat")} stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">
              {t("common.empty")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{t("health.metrics.record")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="field-weight" className="text-sm font-medium">{t("health.metrics.weight")}(kg)</label>
              <Input id="field-weight" type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </div>
            <div>
              <label htmlFor="field-height" className="text-sm font-medium">{t("health.metrics.height")}(cm)</label>
              <Input id="field-height" type="number" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
            </div>
            <div>
              <label htmlFor="field-body-fat" className="text-sm font-medium">{t("health.metrics.bodyFat")}(%)</label>
              <Input id="field-body-fat" type="number" step="0.1" value={form.body_fat} onChange={(e) => setForm({ ...form, body_fat: e.target.value })} />
            </div>
            <div>
              <label htmlFor="field-waist" className="text-sm font-medium">{t("health.metrics.waist")}(cm)</label>
              <Input id="field-waist" type="number" step="0.1" value={form.waist} onChange={(e) => setForm({ ...form, waist: e.target.value })} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!form.weight || !form.height}>{t("common.save")}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
