"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Dumbbell, CheckCircle2 } from "lucide-react"

const API_BASE = "http://localhost:8000/api/v1/personal"

interface ExerciseRecord {
  id: number
  name: string
  duration: number
  calories: number
  date: string
  type: string
}

export default function ExerciseCalendar() {
  const t = useTranslations()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<ExerciseRecord[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  // Today for highlighting
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDay = today.getDate()

  // Build set of exercise dates
  const exerciseDates = new Set(records.map((r) => r.date))

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/health/exercises?year=${year}&month=${month + 1}`)
        const data = await res.json()
        setRecords(data.data ?? [])
      } catch {
        setRecords([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [year, month])

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"]
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  return (
    <div className="space-y-6 p-6">
      {/* Month Navigation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>{t("health.exerciseCalendar")}</CardTitle>
          <div className="flex items-center gap-2">
            <button
              className="text-sm px-2 py-1 rounded hover:bg-muted"
              onClick={() => setCurrentMonth(new Date(year, month - 1))}
            >
              ←
            </button>
            <span className="text-sm font-semibold">{year}年{month + 1}月</span>
            <button
              className="text-sm px-2 py-1 rounded hover:bg-muted"
              onClick={() => setCurrentMonth(new Date(year, month + 1))}
            >
              →
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((d) => (
              <div key={d} className="text-xs font-medium text-text-secondary py-1">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : ""
              const hasExercise = day ? exerciseDates.has(dateStr) : false
              const isToday = day && year === todayYear && month === todayMonth && day === todayDay
              return (
                <div
                  key={i}
                  className={`aspect-square flex flex-col items-center justify-center rounded-md text-sm ${
                    day ? "hover:bg-muted cursor-default" : ""
                  } ${isToday ? "bg-primary/10 text-primary font-bold ring-1 ring-primary/30" : ""}`}
                >
                  {day && (
                    <>
                      <span>{day}</span>
                      {hasExercise && <CheckCircle2 className="size-3 text-green-500 mt-0.5" />}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Exercise Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="size-4 text-primary" />
            {t("health.exerciseRecords")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : records.length > 0 ? (
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-text-secondary">{r.date}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{r.duration}{t("health.unit.minutes")}</span>
                    <Badge variant="outline">{r.calories} {t("health.unit.kcal")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
              {t("common.empty")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
