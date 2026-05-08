"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Pencil } from "lucide-react"

const API_BASE = "http://localhost:8000/api/v1/personal"

interface Account {
  id: number
  name: string
  type: string
  balance: number
  currency: string
  institution?: string
  icon?: string
  color?: string
}

interface AccountForm {
  name: string
  type: string
  balance: string
  currency: string
  institution: string
  icon: string
}

const emptyForm: AccountForm = {
  name: "",
  type: "bank",
  balance: "",
  currency: "CNY",
  institution: "",
  icon: "",
}

export default function AccountList() {
  const t = useTranslations()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<AccountForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/assets/accounts`)
      const json = await res.json()
      setAccounts(json.data ?? json ?? [])
    } catch {
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(acct: Account) {
    setEditingId(acct.id)
    setForm({
      name: acct.name,
      type: acct.type,
      balance: String(acct.balance),
      currency: acct.currency,
      institution: acct.institution ?? "",
      icon: acct.icon ?? "",
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.balance) return
    setSaving(true)
    try {
      const url = editingId
        ? `${API_BASE}/assets/accounts/${editingId}`
        : `${API_BASE}/assets/accounts`
      const method = editingId ? "PUT" : "POST"
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          balance: Number(form.balance),
          currency: form.currency,
          institution: form.institution || undefined,
          icon: form.icon || undefined,
        }),
      })
      setDialogOpen(false)
      await fetchAccounts()
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

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

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("assets.accounts")}</h2>
        <Button onClick={openAdd}>
          <Plus className="size-4 mr-1" />
          {t("assets.addAccount")}
        </Button>
      </div>

      {/* Account Cards Grid */}
      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map((acct) => (
            <Card
              key={acct.id}
              className="cursor-pointer overflow-hidden hover:shadow-md transition-shadow"
              onClick={() => openEdit(acct)}
            >
              <div className={`h-1 ${typeColor(acct.type)}`} />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{acct.name}</span>
                  <Pencil className="size-3 text-text-secondary opacity-50" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(acct.balance, acct.currency)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">
                    {typeLabel(acct.type)}
                  </Badge>
                  <span className="text-xs text-text-secondary">{acct.currency}</span>
                  {acct.institution && (
                    <span className="text-xs text-text-secondary">
                      {acct.institution}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
          {t("common.empty")}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>
            {editingId ? t("assets.editAccount") : t("assets.addAccount")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div>
            <label className="text-sm font-medium">{t("assets.account.name")}</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("assets.account.namePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t("assets.account.type")}</label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                options={[
                  { value: "bank", label: t("assets.accountType.bank") },
                  { value: "cash", label: t("assets.accountType.cash") },
                  { value: "credit", label: t("assets.accountType.credit") },
                  { value: "investment", label: t("assets.accountType.investment") },
                  { value: "other", label: t("assets.accountType.other") },
                ]}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("assets.account.balance")}</label>
              <Input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t("assets.account.currency")}</label>
              <Select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                options={[
                  { value: "CNY", label: "CNY (¥)" },
                  { value: "USD", label: "USD ($)" },
                  { value: "EUR", label: "EUR (€)" },
                  { value: "JPY", label: "JPY (¥)" },
                ]}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("assets.account.institution")}</label>
              <Input
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                placeholder={t("assets.account.institutionPlaceholder")}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t("assets.account.icon")}</label>
            <Input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder={t("assets.account.iconPlaceholder")}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim() || !form.balance || saving}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
