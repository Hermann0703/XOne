"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface FoodFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: FoodFormData) => void
}

export interface FoodFormData {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  meal: string
  serving: string
  note: string
}

export default function FoodForm({ open, onOpenChange, onSubmit }: FoodFormProps) {
  const t = useTranslations()
  const [form, setForm] = useState<FoodFormData>({
    name: "", calories: 0, protein: 0, carbs: 0, fat: 0, meal: "breakfast", serving: "", note: "",
  })

  function handleSubmit() {
    onSubmit?.(form)
    setForm({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, meal: "breakfast", serving: "", note: "" })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t("health.addFood")}</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-3">
        <div>
          <label className="text-sm font-medium" htmlFor="field-name">{t("health.food.name")}</label>
          <Input
            id="field-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium" htmlFor="field-calories">{t("health.food.calories")}</label>
            <Input
              id="field-calories"
              type="number"
              value={form.calories || ""}
              onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="field-protein">{t("health.food.protein")}(g)</label>
            <Input
              id="field-protein"
              type="number"
              value={form.protein || ""}
              onChange={(e) => setForm({ ...form, protein: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="field-carbs">{t("health.food.carbs")}(g)</label>
            <Input
              id="field-carbs"
              type="number"
              value={form.carbs || ""}
              onChange={(e) => setForm({ ...form, carbs: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="field-fat">{t("health.food.fat")}(g)</label>
            <Input
              id="field-fat"
              type="number"
              value={form.fat || ""}
              onChange={(e) => setForm({ ...form, fat: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium" htmlFor="field-meal">{t("health.food.meal")}</label>
            <Select
              id="field-meal"
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
            <label className="text-sm font-medium" htmlFor="field-serving">{t("health.food.serving")}</label>
            <Input
              id="field-serving"
              value={form.serving}
              onChange={(e) => setForm({ ...form, serving: e.target.value })}
              placeholder={t("health.food.servingPlaceholder")}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="field-note">{t("health.food.note")}</label>
          <Textarea
            id="field-note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={2}
          />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
        <Button onClick={handleSubmit} disabled={!form.name || !form.calories}>{t("common.save")}</Button>
      </DialogFooter>
    </Dialog>
  )
}
