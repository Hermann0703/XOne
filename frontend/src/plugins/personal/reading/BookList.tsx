"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Plus, Star, Book } from "lucide-react"

const API_BASE = "http://localhost:8000/api/v1/personal"

const STATUS_TABS = [
  { value: "", labelKey: "reading.status.all" },
  { value: "wish", labelKey: "reading.status.wish" },
  { value: "reading", labelKey: "reading.status.reading" },
  { value: "done", labelKey: "reading.status.done" },
  { value: "dropped", labelKey: "reading.status.dropped" },
]

const STATUS_BADGE: Record<string, { labelKey: string; variant: "default" | "secondary" | "success" | "warning" | "outline" }> = {
  wish: { labelKey: "reading.status.wish", variant: "secondary" },
  reading: { labelKey: "reading.status.reading", variant: "default" },
  done: { labelKey: "reading.status.done", variant: "success" },
  dropped: { labelKey: "reading.status.dropped", variant: "outline" },
}

interface Book {
  id: number
  title: string
  author: string
  isbn: string
  publisher: string
  pub_year: number
  status: string
  rating: number
  total_pages: number
  current_page: number
  cover_url: string
}

interface BookFormData {
  title: string
  author: string
  isbn: string
  publisher: string
  pub_year: string
  status: string
  rating: string
  total_pages: string
  current_page: string
}

const emptyForm: BookFormData = {
  title: "", author: "", isbn: "", publisher: "", pub_year: "",
  status: "wish", rating: "0", total_pages: "", current_page: "0",
}

export default function BookList() {
  const t = useTranslations()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<BookFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: "1", size: "50" })
      if (statusFilter) params.set("status", statusFilter)
      if (search) params.set("search", search)
      const res = await fetch(`${API_BASE}/reading/books?${params}`)
      const data = await res.json()
      setBooks(data.data ?? [])
    } catch {
      setBooks([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  function handleAdd() {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.title || !form.author) return
    setSubmitting(true)
    try {
      const body = {
        title: form.title,
        author: form.author,
        isbn: form.isbn || undefined,
        publisher: form.publisher || undefined,
        pub_year: form.pub_year ? Number(form.pub_year) : undefined,
        status: form.status,
        rating: Number(form.rating),
        total_pages: form.total_pages ? Number(form.total_pages) : undefined,
        current_page: Number(form.current_page) || 0,
      }
      await fetch(`${API_BASE}/reading/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      setDialogOpen(false)
      fetchBooks()
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`size-3 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-button" />
          ))}
          <Skeleton className="h-9 w-48 rounded-input ml-auto" />
          <Skeleton className="h-9 w-28 rounded-button" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-72 rounded-card" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-bg-secondary rounded-button p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-button transition-colors ${
                statusFilter === tab.value
                  ? "bg-bg-card text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("reading.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="size-4" />
          {t("reading.addBook")}
        </Button>
      </div>

      {/* Book Grid */}
      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Book className="size-12 mb-3 opacity-30" />
          <p className="text-sm">{t("common.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((book) => {
            const badge = STATUS_BADGE[book.status] ?? { labelKey: "reading.status.wish", variant: "outline" as const }
            const progress = book.total_pages > 0 ? Math.round((book.current_page / book.total_pages) * 100) : 0
            return (
              <Card key={book.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Cover placeholder */}
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <Book className="size-12 text-gray-400" />
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-1">{book.title}</CardTitle>
                    <Badge variant={badge.variant} className="shrink-0">{t(badge.labelKey)}</Badge>
                  </div>
                  <p className="text-xs text-text-secondary">{book.author}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    {renderStars(book.rating)}
                    <span className="text-xs text-text-secondary">{book.publisher}</span>
                  </div>
                  {/* Progress bar */}
                  {book.status === "reading" && book.total_pages > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-text-secondary">
                        <span>{t("reading.progress")}</span>
                        <span>{book.current_page}/{book.total_pages} ({progress}%)</span>
                      </div>
                      <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Book Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{t("reading.addBook")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium">{t("reading.book.title")}</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("reading.book.titlePlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("reading.book.author")}</label>
              <Input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder={t("reading.book.authorPlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("reading.book.isbn")}</label>
              <Input
                value={form.isbn}
                onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                placeholder="ISBN"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("reading.book.publisher")}</label>
              <Input
                value={form.publisher}
                onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                placeholder={t("reading.book.publisherPlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("reading.book.pubYear")}</label>
              <Input
                type="number"
                value={form.pub_year}
                onChange={(e) => setForm({ ...form, pub_year: e.target.value })}
                placeholder="2024"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("reading.book.status")}</label>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                options={STATUS_TABS.filter((s) => s.value !== "").map((s) => ({
                  value: s.value,
                  label: t(s.labelKey),
                }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("reading.book.rating")}</label>
              <Select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                options={[
                  { value: "0", label: t("reading.rating.none") },
                  { value: "1", label: "⭐ 1" },
                  { value: "2", label: "⭐⭐ 2" },
                  { value: "3", label: "⭐⭐⭐ 3" },
                  { value: "4", label: "⭐⭐⭐⭐ 4" },
                  { value: "5", label: "⭐⭐⭐⭐⭐ 5" },
                ]}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("reading.book.totalPages")}</label>
              <Input
                type="number"
                value={form.total_pages}
                onChange={(e) => setForm({ ...form, total_pages: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("reading.book.currentPage")}</label>
              <Input
                type="number"
                value={form.current_page}
                onChange={(e) => setForm({ ...form, current_page: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!form.title || !form.author || submitting}>
            {submitting ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
