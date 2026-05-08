"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Heart, Flame, Clock, TrendingDown, Utensils } from "lucide-react"

interface KPI {
  label: string
  value: string
  unit: string
  icon: React.ReactNode
}

interface WeightTrend {
  date: string
  weight: number
}

interface FoodItem {
  id: number
  name: string
  calories: number
  meal: string
  time: string
}

const API_BASE = "http://localhost:8000/api/v1/personal"

export default function HealthDashboard() {
  const t = useTranslations()
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<KPI[]>([])
  const [weightTrend, setWeightTrend] = useState<WeightTrend[]>([])
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const [kpiRes, weightRes, foodRes] = await Promise.all([
          fetch(`${API_BASE}/health/summary`),
          fetch(`${API_BASE}/health/weight-trend?days=30`),
          fetch(`${API_BASE}/health/foods?limit=5`),
        ])
        const kpiData = await kpiRes.json()
        const weightData = await weightRes.json()
        const foodData = await foodRes.json()

        if (kpiData.data) {
          setKpis([
            { label: t("health.kpi.caloriesIn"), value: String(kpiData.data.calories_in ?? 0), unit: t("health.unit.kcal"), icon: <Utensils className="size-5 text-orange-500" /> },
            { label: t("health.kpi.caloriesOut"), value: String(kpiData.data.calories_out ?? 0), unit: t("health.unit.kcal"), icon: <Flame className="size-5 text-red-500" /> },
            { label: t("health.kpi.exerciseMinutes"), value: String(kpiData.data.exercise_minutes ?? 0), unit: t("health.unit.minutes"), icon: <Clock className="size-5 text-blue-500" /> },
          ])
        }
        setWeightTrend(weightData.data ?? [])
        setRecentFoods(foodData.data ?? [])
      } catch {
        // 后端未就绪时使用占位数据
        setKpis([
          { label: t("health.kpi.caloriesIn"), value: "--", unit: t("health.unit.kcal"), icon: <Utensils className="size-5 text-orange-500" /> },
          { label: t("health.kpi.caloriesOut"), value: "--", unit: t("health.unit.kcal"), icon: <Flame className="size-5 text-red-500" /> },
          { label: t("health.kpi.exerciseMinutes"), value: "--", unit: t("health.unit.minutes"), icon: <Clock className="size-5 text-blue-500" /> },
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [t])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-card" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">{kpi.label}</CardTitle>
              {kpi.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-text-secondary">{kpi.unit}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts + Recent Foods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="size-4 text-primary" />
              {t("health.weightTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weightTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weightTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-text-secondary text-sm">
                {t("common.empty")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Foods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="size-4 text-primary" />
              {t("health.recentFoods")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentFoods.length > 0 ? (
              <div className="space-y-3">
                {recentFoods.map((food) => (
                  <div key={food.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{food.name}</p>
                      <p className="text-xs text-text-secondary">{food.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{food.calories} {t("health.unit.kcal")}</p>
                      <p className="text-xs text-text-secondary">{food.meal}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-text-secondary text-sm">
                {t("common.empty")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
