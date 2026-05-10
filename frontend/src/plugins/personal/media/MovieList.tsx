"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Plus, Star, Film } from "lucide-react"

const API_BASE = "http://localhost:8000/api/v1/personal"

const STATUS_TABS = [
  { value: "", labelKey: "media.status.all" },
  { value: "wish", labelKey: "media.status.wish" },
  { value: "watching", labelKey: "media.status.watching" },
  { value: "done", labelKey: "media.status.done" },
  { value: "dropped", labelKey: "media.status.dropped" },
]

const STATUS_BADGE: Record<string, { labelKey: string; variant: "default" | "secondary" | "success" | "warning" | "outline" }> = {
  wish: { labelKey: "media.status.wish", variant: "secondary" },
  watching: { labelKey: "media.status.watching", variant: "default" },
  done: { labelKey: "media.status.done", variant: "success" },
  dropped: { labelKey: "media.status.dropped", variant: "outline" },
}

interface Movie {
  id: number
  title: string
  title_en: string
  year: number
  director: string
  genre: string
  country: string
  douban_url: string
  status: string
  rating: number
  poster_url: string
}

interface MovieFormData {
  title: string
  title_en: string
  year: string
  director: string
  genre: string
  country: string
  douban_url: string
  status: string
  rating: string
}

const emptyForm: MovieFormData = {
  title: "", title_en: "", year: "", director: "", genre: "",
  country: "", douban_url: "", status: "wish", rating: "0",
}

export default function MovieList() {
  const t = useTranslations()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<MovieFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchMovies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: "1", size: "50" })
      if (statusFilter) params.set("status", statusFilter)
      if (search) params.set("search", search)
      const res = await fetch(`${API_BASE}/media/movies?${params}`)
      const data = await res.json()
      setMovies(data.data ?? [])
    } catch {
      setMovies([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    fetchMovies()
  }, [fetchMovies])

  function handleAdd() {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.title) return
    setSubmitting(true)
    try {
      const body = {
        title: form.title,
        title_en: form.title_en || undefined,
        year: form.year ? Number(form.year) : undefined,
        director: form.director || undefined,
        genre: form.genre || undefined,
        country: form.country || undefined,
        douban_url: form.douban_url || undefined,
        status: form.status,
        rating: Number(form.rating),
      }
      await fetch(`${API_BASE}/media/movies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      setDialogOpen(false)
      fetchMovies()
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
            className={`size-3 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
          />
        ))}
      </div>
    )
  }

  function renderGenres(genreStr: string) {
    if (!genreStr) return null
    return genreStr.split(",").map((g) => g.trim()).filter(Boolean).map((genre, i) => (
      <Badge key={i} variant="outline" className="text-xs">{genre}</Badge>
    ))
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
            <Skeleton key={i} className="h-96 rounded-card" />
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
            placeholder={t("media.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="size-4" />
          {t("media.addMovie")}
        </Button>
      </div>

      {/* Movie Grid */}
      {movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Film className="size-12 mb-3 opacity-30" />
          <p className="text-sm">{t("common.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {movies.map((movie) => {
            const badge = STATUS_BADGE[movie.status] ?? { labelKey: "media.status.wish", variant: "outline" as const }
            return (
              <Card key={movie.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Poster placeholder */}
                <div className="h-64 bg-gray-300 dark:bg-gray-600 flex items-center justify-center relative">
                  {movie.poster_url ? (
                    <Image src={movie.poster_url} alt={movie.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                  ) : (
                    <Film className="size-16 text-gray-400 dark:text-gray-500" />
                  )}
                  <Badge variant={badge.variant} className="absolute top-2 right-2">
                    {t(badge.labelKey)}
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-1">{movie.title}</CardTitle>
                  {movie.title_en && (
                    <p className="text-xs text-text-secondary line-clamp-1">{movie.title_en}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>{movie.year || "--"}</span>
                    <span className="line-clamp-1">{movie.director}</span>
                    {movie.country && <span>{movie.country}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    {renderStars(movie.rating)}
                  </div>
                  {movie.genre && (
                    <div className="flex flex-wrap gap-1">
                      {renderGenres(movie.genre)}
                    </div>
                  )}
                  {movie.douban_url && (
                    <a
                      href={movie.douban_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-block mt-1"
                    >
                      {t("media.doubanLink")}
                    </a>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Movie Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{t("media.addMovie")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium">{t("media.movie.title")}</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("media.movie.titlePlaceholder")}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">{t("media.movie.titleEn")}</label>
              <Input
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                placeholder={t("media.movie.titleEnPlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("media.movie.year")}</label>
              <Input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder="2024"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("media.movie.director")}</label>
              <Input
                value={form.director}
                onChange={(e) => setForm({ ...form, director: e.target.value })}
                placeholder={t("media.movie.directorPlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("media.movie.genre")}</label>
              <Input
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                placeholder={t("media.movie.genrePlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("media.movie.country")}</label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder={t("media.movie.countryPlaceholder")}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">{t("media.movie.doubanUrl")}</label>
              <Input
                value={form.douban_url}
                onChange={(e) => setForm({ ...form, douban_url: e.target.value })}
                placeholder="https://movie.douban.com/subject/..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("media.movie.status")}</label>
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
              <label className="text-sm font-medium">{t("media.movie.rating")}</label>
              <Select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                options={[
                  { value: "0", label: t("media.rating.none") },
                  { value: "1", label: "⭐ 1" },
                  { value: "2", label: "⭐⭐ 2" },
                  { value: "3", label: "⭐⭐⭐ 3" },
                  { value: "4", label: "⭐⭐⭐⭐ 4" },
                  { value: "5", label: "⭐⭐⭐⭐⭐ 5" },
                ]}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!form.title || submitting}>
            {submitting ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
