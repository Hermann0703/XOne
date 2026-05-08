"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react"

const API_BASE = "http://localhost:8000/api/v1/personal"

interface FoodRecord {
  id: number
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  meal: string
  date: string
  serving?: string
  note?: string
}

const MEAL_OPTIONS = [
  { value: "breakfast", label: "" },
  { value: "lunch", label: "" },
  { value: "dinner", label: "" },
  { value: "snack", label: "" },
]

const MEAL_BADGE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "warning"> = {
  breakfast: "default",
  lunch: "secondary",
  dinner: "outline",
  snack: "warning",
}

export default function FoodRecord() {
  const t = useTranslations()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<FoodRecord[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [mealFilter, setMealFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", meal: "breakfast", serving: "", note: "" })

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (mealFilter) params.set("meal", mealFilter)
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      if (search) params.set("search", search)

      const res = await fetch(`${API_BASE}/health/foods?${params}`)
      const data = await res.json()
      setRecords(data.data ?? [])
      setTotalPages(data.paging?.total_pages ?? 1)
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [page, mealFilter, dateFrom, dateTo, search])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function handleSubmit() {
    try {
      await fetch(`${API_BASE}/health/foods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          calories: Number(form.calories),
          protein: Number(form.protein) || 0,
          carbs: Number(form.carbs) || 0,
          fat: Number(form.fat) || 0,
          meal: form.meal,
          serving: form.serving,
          note: form.note,
        }),
      })
      setDialogOpen(false)
      setForm({ name: "", calories: "", protein: "", carbs: "", fat: "", meal: "breakfast", serving: "", note: "" })
      fetchRecords()
    } catch {
      // handle error
    }
  }

  const mealLabels: Record<string, string> = {
    breakfast: t("health.meal.breakfast"),
    lunch: t("health.meal.lunch"),
    dinner: t("health.meal.dinner"),
    snack: t("health.meal.snack"),
  }

  return (
    <div className="space-y-4 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("health.foodRecords")}</CardTitle>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-1" />
            {t("common.add")}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
              <Input
                className="pl-8"
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Select
              className="w-[140px]"
              value={mealFilter}
              onChange={(e) => { setMealFilter(e.target.value); setPage(1) }}
              options={[
                { value: "", label: t("health.filter.allMeals") },
                { value: "breakfast", label: t("health.meal.breakfast") },
                { value: "lunch", label: t("health.meal.lunch") },
                { value: "dinner", label: t("health.meal.dinner") },
                { value: "snack", label: t("health.meal.snack") },
              ]}
            />
            <Input
              type="date"
              className="w-[160px]"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            />
            <Input
              type="date"
              className="w-[160px]"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : records.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("health.food.name")}</TableHead>
                    <TableHead>{t("health.food.calories")}</TableHead>
                    <TableHead>{t("health.food.protein")}</TableHead>
                    <TableHead>{t("health.food.carbs")}</TableHead>
                    <TableHead>{t("health.food.fat")}</TableHead>
                    <TableHead>{t("health.food.meal")}</TableHead>
                    <TableHead>{t("health.food.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.calories}</TableCell>
                      <TableCell>{r.protein}g</TableCell>
                      <TableCell>{r.carbs}g</TableCell>
                      <TableCell>{r.fat}g</TableCell>
                      <TableCell>
                        <Badge variant={MEAL_BADGE_VARIANTS[r.meal] ?? "default"}>
                          {mealLabels[r.meal] ?? r.meal}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-secondary">{r.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-text-secondary">{t("health.pagination", { page, total: totalPages })}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
              {t("common.empty")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Food Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{t("health.addFood")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div>
            <label className="text-sm font-medium">{t("health.food.name")}</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t("health.food.calories")}</label>
              <Input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("health.food.protein")}(g)</label>
              <Input type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("health.food.carbs")}(g)</label>
              <Input type="number" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("health.food.fat")}(g)</label>
              <Input type="number" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t("health.food.meal")}</label>
              <Select
                value={form.meal}
                onChange={(e) => setForm({ ...form, meal: e.target.value })}
                options={[
                  { value: "breakfast", label: t("health.meal.breakfast") },
                  { value: "lunch", label: t("health.meal.lunch") },
                  { value: "dinner", label: t("health.meal.dinner") },
                  { value: "snack", label: t("health.meal.snack") },
                ]}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("health.food.serving")}</label>
              <Input value={form.serving} onChange={(e) => setForm({ ...form, serving: e.target.value })} placeholder={t("health.food.servingPlaceholder")} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t("health.food.note")}</label>
            <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.calories}>{t("common.save")}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
