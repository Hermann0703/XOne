"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"

const API_BASE = "http://localhost:8000/api/v1/personal"

interface Transaction {
  id: number
  date: string
  type: string
  category: string
  amount: number
  description?: string
  tags?: string
  account_name?: string
  account_id?: number
}

interface AccountRef {
  id: number
  name: string
}

interface TxForm {
  account_id: string
  type: string
  category: string
  amount: string
  description: string
  date: string
}

const emptyTxForm: TxForm = {
  account_id: "",
  type: "expense",
  category: "",
  amount: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
}

const CATEGORIES = [
  "food", "transport", "shopping", "housing",
  "entertainment", "medical", "education", "salary",
  "investment", "other",
]

export default function TransactionList() {
  const t = useTranslations()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<AccountRef[]>([])
  const [total, setTotal] = useState(0)

  // Filters
  const [filterType, setFilterType] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Pagination
  const [page, setPage] = useState(1)
  const [size] = useState(20)

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<TxForm>(emptyTxForm)
  const [saving, setSaving] = useState(false)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("size", String(size))
      if (filterType) params.set("type", filterType)
      if (filterCategory) params.set("category", filterCategory)
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)

      const res = await fetch(`${API_BASE}/assets/transactions?${params}`)
      const json = await res.json()
      const data = json.data ?? json
      setTransactions(data.items ?? data ?? [])
      setTotal(data.total ?? (Array.isArray(data) ? data.length : 0))
    } catch {
      setTransactions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, size, filterType, filterCategory, dateFrom, dateTo])

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/assets/accounts`)
      const json = await res.json()
      const list: AccountRef[] = (json.data ?? json ?? []).map((a: { id: number; name: string }) => ({
        id: a.id,
        name: a.name,
      }))
      setAccounts(list)
    } catch {
      setAccounts([])
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  function handleFilterChange() {
    setPage(1)
  }

  function openAddDialog() {
    setForm(emptyTxForm)
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.account_id || !form.amount || !form.category) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/assets/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: Number(form.account_id),
          type: form.type,
          category: form.category,
          amount: Number(form.amount),
          description: form.description || undefined,
          date: form.date,
        }),
      })
      setDialogOpen(false)
      setForm(emptyTxForm)
      await fetchTransactions()
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

  function formatCurrency(val: number) {
    return `¥${val.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  function txTypeBadge(typ: string) {
    if (typ === "income")
      return <Badge variant="success">{t("assets.txType.income")}</Badge>
    if (typ === "expense")
      return <Badge variant="destructive">{t("assets.txType.expense")}</Badge>
    return <Badge variant="secondary">{t("assets.txType.transfer")}</Badge>
  }

  function amountClass(typ: string) {
    if (typ === "income") return "text-green-600"
    if (typ === "expense") return "text-red-600"
    return "text-blue-600"
  }

  function amountPrefix(typ: string) {
    if (typ === "income") return "+"
    if (typ === "expense") return "-"
    return ""
  }

  function catLabel(cat: string) {
    const key = `assets.category.${cat}`
    const translated = t(key)
    return translated === key ? cat : translated
  }

  const totalPages = Math.max(1, Math.ceil(total / size))

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="flex gap-3 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-32" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-card" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("assets.transactions")}</h2>
        <Button onClick={openAddDialog}>
          <Plus className="size-4 mr-1" />
          {t("assets.addTransaction")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[120px]">
              <label htmlFor="field-filter-type" className="text-xs font-medium text-text-secondary block mb-1">
                {t("assets.tx.type")}
              </label>
              <Select
                id="field-filter-type"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value)
                  handleFilterChange()
                }}
                placeholder={t("assets.filter.allTypes")}
                options={[
                  { value: "income", label: t("assets.txType.income") },
                  { value: "expense", label: t("assets.txType.expense") },
                  { value: "transfer", label: t("assets.txType.transfer") },
                ]}
              />
            </div>
            <div className="min-w-[140px]">
              <label htmlFor="field-filter-category" className="text-xs font-medium text-text-secondary block mb-1">
                {t("assets.tx.category")}
              </label>
              <Select
                id="field-filter-category"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value)
                  handleFilterChange()
                }}
                placeholder={t("assets.filter.allCategories")}
                options={CATEGORIES.map((c) => ({
                  value: c,
                  label: catLabel(c),
                }))}
              />
            </div>
            <div>
              <label htmlFor="field-filter-dateFrom" className="text-xs font-medium text-text-secondary block mb-1">
                {t("assets.filter.dateFrom")}
              </label>
              <Input
                id="field-filter-dateFrom"
                type="date"
                className="h-10 w-36"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  handleFilterChange()
                }}
              />
            </div>
            <div>
              <label htmlFor="field-filter-dateTo" className="text-xs font-medium text-text-secondary block mb-1">
                {t("assets.filter.dateTo")}
              </label>
              <Input
                id="field-filter-dateTo"
                type="date"
                className="h-10 w-36"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  handleFilterChange()
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Top */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">
          {t("assets.pagination.total", { total })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">{t("assets.tx.date")}</TableHead>
                  <TableHead>{t("assets.tx.account")}</TableHead>
                  <TableHead>{t("assets.tx.type")}</TableHead>
                  <TableHead>{t("assets.tx.category")}</TableHead>
                  <TableHead className="text-right">{t("assets.tx.amount")}</TableHead>
                  <TableHead>{t("assets.tx.description")}</TableHead>
                  <TableHead>{t("assets.tx.tags")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">{tx.date}</TableCell>
                      <TableCell className="text-xs">{tx.account_name ?? "--"}</TableCell>
                      <TableCell>{txTypeBadge(tx.type)}</TableCell>
                      <TableCell className="text-xs">{catLabel(tx.category)}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${amountClass(tx.type)}`}>
                        {amountPrefix(tx.type)}{formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary max-w-[180px] truncate">
                        {tx.description ?? "--"}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {tx.tags ? (
                          <div className="flex gap-1 flex-wrap">
                            {tx.tags.split(",").map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">
                                {tag.trim()}
                              </Badge>
                            ))}
                          </div>
                        ) : "--"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-secondary py-12">
                      {t("common.empty")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pagination Bottom */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm px-4">
          {t("assets.pagination.pageInfo", { page, total: totalPages })}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{t("assets.addTransaction")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div>
            <label htmlFor="field-account" className="text-sm font-medium">{t("assets.tx.account")}</label>
            <Select
              id="field-account"
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              placeholder={t("assets.tx.selectAccount")}
              options={accounts.map((a) => ({
                value: String(a.id),
                label: a.name,
              }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="field-type" className="text-sm font-medium">{t("assets.tx.type")}</label>
              <Select
                id="field-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                options={[
                  { value: "income", label: t("assets.txType.income") },
                  { value: "expense", label: t("assets.txType.expense") },
                  { value: "transfer", label: t("assets.txType.transfer") },
                ]}
              />
            </div>
            <div>
              <label htmlFor="field-category" className="text-sm font-medium">{t("assets.tx.category")}</label>
              <Select
                id="field-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder={t("assets.tx.selectCategory")}
                options={CATEGORIES.map((c) => ({
                  value: c,
                  label: catLabel(c),
                }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="field-amount" className="text-sm font-medium">{t("assets.tx.amount")}</label>
              <Input
                id="field-amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="field-date" className="text-sm font-medium">{t("assets.tx.date")}</label>
              <Input
                id="field-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label htmlFor="field-description" className="text-sm font-medium">{t("assets.tx.description")}</label>
            <Input
              id="field-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("assets.tx.descriptionPlaceholder")}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.account_id || !form.amount || !form.category || saving}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
