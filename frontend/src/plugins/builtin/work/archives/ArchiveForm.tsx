"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save } from 'lucide-react'
import { useArchiveStore } from './store'

export default function ArchiveForm() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string | undefined
  const isEdit = Boolean(id)

  const { selectedArchive, fetchArchives, createArchive, updateArchive} = useArchiveStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    archive_no: '',
    title: '',
    fonds_id: '',
    category_id: '',
    security_level: '',
    file_no: '',
    volume_no: '',
    responsible_person: '',
    doc_date: '',
    page_count: '',
    retention_period: '',
    location: '',
    description: '',
    keywords: '',
    box_id: '',
  })

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true)
      // 通过archive_no查找
      fetchArchives({ search: id, size: 1 }).then(() => {
        const store = useArchiveStore.getState()
        const archive = store.archives.find(
          (a) => String(a.id) === String(id) || String(a.archive_no) === String(id)
        )
        if (archive) {
          setForm({
            archive_no: archive.archive_no ?? '',
            title: archive.title ?? '',
            fonds_id: archive.fonds_id ? String(archive.fonds_id) : '',
            category_id: archive.category_id ? String(archive.category_id) : '',
            security_level: archive.security_level ?? '',
            file_no: archive.file_no ?? '',
            volume_no: archive.volume_no ?? '',
            responsible_person: archive.responsible_person ?? '',
            doc_date: archive.doc_date ?? '',
            page_count: archive.page_count ? String(archive.page_count) : '',
            retention_period: archive.retention_period ?? '',
            location: archive.location ?? '',
            description: archive.description ?? '',
            keywords: archive.keywords ?? '',
            box_id: archive.box_id ? String(archive.box_id) : '',
          })
        }
        setLoading(false)
      })
    }
  }, [isEdit, id, fetchArchives])

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.archive_no.trim() || !form.title.trim()) return

    setSaving(true)
    const payload = {
      ...form,
      fonds_id: form.fonds_id ? Number(form.fonds_id) : undefined,
      category_id: form.category_id ? Number(form.category_id) : undefined,
      page_count: form.page_count ? Number(form.page_count) : undefined,
      box_id: form.box_id ? Number(form.box_id) : undefined,
    }

    const result = isEdit && id
      ? await updateArchive(Number(id), payload)
      : await createArchive(payload)

    setSaving(false)
    if (result) {
      router.push('/work/archives')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => <Skeleton key={i} className="h-10 rounded" />)}
        </div>
        <Skeleton className="h-24 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold">{isEdit ? '编辑档案' : '新建档案'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 档号 + 题名 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-archive-no" className="text-sm font-medium">档号 <span className="text-destructive">*</span></label>
                <Input
                  id="field-archive-no"
                  value={form.archive_no}
                  onChange={(e) => update('archive_no', e.target.value)}
                  placeholder="请输入档号，如 A-2025-001"
                  required
                />
              </div>
              <div>
                <label htmlFor="field-archive-title" className="text-sm font-medium">题名 <span className="text-destructive">*</span></label>
                <Input
                  id="field-archive-title"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="请输入档案题名"
                  required
                />
              </div>
            </div>

            {/* 全宗 + 分类 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-archive-fonds" className="text-sm font-medium">全宗</label>
                <Select
                  id="field-archive-fonds"
                  value={form.fonds_id}
                  onChange={(e) => update('fonds_id', e.target.value)}
                  placeholder="选择全宗"
                  options={[
                    { value: '', label: '请选择' },
                    { value: '1', label: '全宗一' },
                    { value: '2', label: '全宗二' },
                  ]}
                />
              </div>
              <div>
                <label htmlFor="field-archive-category" className="text-sm font-medium">分类</label>
                <Select
                  id="field-archive-category"
                  value={form.category_id}
                  onChange={(e) => update('category_id', e.target.value)}
                  placeholder="选择分类"
                  options={[
                    { value: '', label: '请选择' },
                    { value: '1', label: '行政文书' },
                    { value: '2', label: '财务档案' },
                    { value: '3', label: '人事档案' },
                    { value: '4', label: '技术档案' },
                    { value: '5', label: '法律档案' },
                    { value: '99', label: '其他' },
                  ]}
                />
              </div>
            </div>

            {/* 密级 + 文件编号 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-archive-security" className="text-sm font-medium">密级</label>
                <Select
                  id="field-archive-security"
                  value={form.security_level}
                  onChange={(e) => update('security_level', e.target.value)}
                  placeholder="选择密级"
                  options={[
                    { value: '', label: '请选择' },
                    { value: 'public', label: '公开' },
                    { value: 'internal', label: '内部' },
                    { value: 'secret', label: '秘密' },
                    { value: 'confidential', label: '机密' },
                  ]}
                />
              </div>
              <div>
                <label htmlFor="field-archive-file-no" className="text-sm font-medium">文件编号</label>
                <Input
                  id="field-archive-file-no"
                  value={form.file_no}
                  onChange={(e) => update('file_no', e.target.value)}
                  placeholder="文件编号"
                />
              </div>
            </div>

            {/* 卷号 + 责任人 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-archive-volume-no" className="text-sm font-medium">卷号</label>
                <Input
                  id="field-archive-volume-no"
                  value={form.volume_no}
                  onChange={(e) => update('volume_no', e.target.value)}
                  placeholder="卷号"
                />
              </div>
              <div>
                <label htmlFor="field-archive-responsible" className="text-sm font-medium">责任人</label>
                <Input
                  id="field-archive-responsible"
                  value={form.responsible_person}
                  onChange={(e) => update('responsible_person', e.target.value)}
                  placeholder="责任人"
                />
              </div>
            </div>

            {/* 文件日期 + 页数 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-archive-doc-date" className="text-sm font-medium">文件日期</label>
                <Input
                  id="field-archive-doc-date"
                  type="date"
                  value={form.doc_date}
                  onChange={(e) => update('doc_date', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="field-archive-page-count" className="text-sm font-medium">页数</label>
                <Input
                  id="field-archive-page-count"
                  type="number"
                  value={form.page_count}
                  onChange={(e) => update('page_count', e.target.value)}
                  placeholder="页数"
                  min={0}
                />
              </div>
            </div>

            {/* 保管期限 + 存放位置 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-archive-retention" className="text-sm font-medium">保管期限</label>
                <Select
                  id="field-archive-retention"
                  value={form.retention_period}
                  onChange={(e) => update('retention_period', e.target.value)}
                  placeholder="选择保管期限"
                  options={[
                    { value: '', label: '请选择' },
                    { value: 'permanent', label: '永久' },
                    { value: 'long_term', label: '长期' },
                    { value: 'short_term', label: '短期' },
                    { value: '30_years', label: '30年' },
                    { value: '10_years', label: '10年' },
                  ]}
                />
              </div>
              <div>
                <label htmlFor="field-archive-location" className="text-sm font-medium">存放位置</label>
                <Input
                  id="field-archive-location"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  placeholder="如：A区-3号柜-2层"
                />
              </div>
            </div>

            {/* 档案盒 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-archive-box-id" className="text-sm font-medium">档案盒编号</label>
                <Input
                  id="field-archive-box-id"
                  value={form.box_id}
                  onChange={(e) => update('box_id', e.target.value)}
                  placeholder="档案盒ID（上下架用）"
                />
              </div>
            </div>

            {/* 关键词 */}
            <div>
              <label htmlFor="field-archive-keywords" className="text-sm font-medium">关键词</label>
              <Input
                id="field-archive-keywords"
                value={form.keywords}
                onChange={(e) => update('keywords', e.target.value)}
                placeholder="关键词，用逗号分隔"
              />
            </div>

            {/* 描述 */}
            <div>
              <label htmlFor="field-archive-description" className="text-sm font-medium">描述</label>
              <Textarea
                id="field-archive-description"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="档案内容的简要描述"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" disabled={!form.archive_no.trim() || !form.title.trim() || saving}>
            <Save className="size-4 mr-1" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    </div>
  )
}
