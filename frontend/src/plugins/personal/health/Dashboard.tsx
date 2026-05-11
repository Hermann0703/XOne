"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"
import { Heart, Flame, Clock, TrendingDown, Utensils, Plus } from "lucide-react"

const WeightTrendChart = dynamic(() => import("./WeightTrendChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[240px] w-full" />,
})

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
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isEmpty, setIsEmpty] = useState(false)
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
        // Check if truly empty (all values zero and arrays empty)
        const hasData =
          (kpiData.data && (kpiData.data.calories_in > 0 || kpiData.data.calories_out > 0 || kpiData.data.exercise_minutes > 0)) ||
          (weightData.data && weightData.data.length > 0) ||
          (foodData.data && foodData.data.length > 0)
        setIsEmpty(!hasData)
      } catch {
        // 后端未就绪时显示空态
        setIsEmpty(true)
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

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 mb-6">
          <Heart className="size-10 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          {t("health.empty.title")}
        </h2>
        <p className="text-sm text-text-secondary mb-6 text-center max-w-md">
          {t("health.empty.description")}
        </p>
        <Button
          onClick={() => router.push(`/${locale}/personal/health/add`)}
        >
          <Plus className="size-4 mr-1.5" />
          {t("health.empty.cta")}
        </Button>
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
              <span className="text-sm font-medium text-text-secondary">{kpi.label}</span>
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
            <CardTitle as="h2" className="flex items-center gap-2 text-base">
              <TrendingDown className="size-4 text-primary" />
              {t("health.weightTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeightTrendChart
              data={weightTrend}
              emptyLabel={t("common.empty")}
            />
          </CardContent>
        </Card>

        {/* Recent Foods */}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2 text-base">
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
