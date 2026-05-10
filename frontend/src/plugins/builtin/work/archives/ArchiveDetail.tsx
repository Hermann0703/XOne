"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Upload, Trash2, File as FileIcon } from 'lucide-react'
import { useArchiveStore, type Archive, type FileRecord } from './store'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' }> = {
  archived: { label: '已归档', variant: 'success' },
  borrowed: { label: '已借出', variant: 'warning' },
  destroyed: { label: '已销毁', variant: 'destructive' },
  active: { label: '在库', variant: 'default' },
}

const RETENTION_LABEL: Record<string, string> = {
  permanent: '永久', long_term: '长期', short_term: '短期', '30_years': '30年', '10_years': '10年',
}

export default function ArchiveDetail() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { archives, borrows, appraisals, fetchArchives, fetchFiles, uploadFile, deleteFile, fetchBorrows, fetchAppraisals } = useArchiveStore()
  const [archive, setArchive] = useState<Archive | null>(null)
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('files')
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    await fetchArchives({ search: id, size: 1 })

    const store = useArchiveStore.getState()
    const found = store.archives.find(
      (a) => String(a.id) === String(id) || String(a.archive_no) === String(id)
    )
    if (found) {
      setArchive(found)
      const fileList = await fetchFiles(found.id)
      setFiles(fileList)
      await fetchBorrows({ archive_id: found.id })
      await fetchAppraisals({ archive_id: found.id })
    }
    setLoading(false)
  }, [id, fetchArchives, fetchFiles, fetchBorrows, fetchAppraisals])

  useEffect(() => { load() }, [load])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !archive) return
    setUploading(true)
    const ok = await uploadFile(archive.id, file)
    if (ok) {
      const updatedFiles = await useArchiveStore.getState().fetchFiles(archive.id)
      setFiles(updatedFiles)
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleDeleteFile(fileId: number) {
    if (!window.confirm('确认删除该文件？')) return
    const ok = await deleteFile(fileId)
    if (ok) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-card" />
          <div className="lg:col-span-2"><Skeleton className="h-80 rounded-card" /></div>
        </div>
      </div>
    )
  }

  if (!archive) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">档案不存在</p>
      </div>
    )
  }

  const archBorrows = useArchiveStore.getState().borrows.filter((b) => b.archive_id === archive.id)
  const archAppraisals = useArchiveStore.getState().appraisals.filter((a) => a.archive_id === archive.id)

  return (
    <div className="space-y-6 p-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold">档案详情</h2>
        <div className="flex-1" />
        <Button size="sm" onClick={() => router.push(`/work/archives/${archive.id}/edit`)}>编辑</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：档案信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{archive.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">档号</span>
              <span className="font-mono font-medium">{archive.archive_no}</span>
            </div>
            {archive.fonds_name && (
              <div className="flex justify-between">
                <span className="text-text-secondary">全宗</span>
                <span>{archive.fonds_name}</span>
              </div>
            )}
            {archive.category_name && (
              <div className="flex justify-between">
                <span className="text-text-secondary">分类</span>
                <span>{archive.category_name}</span>
              </div>
            )}
            {archive.security_level && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">密级</span>
                <Badge variant="outline">{archive.security_level === 'public' ? '公开' : archive.security_level === 'internal' ? '内部' : archive.security_level === 'secret' ? '秘密' : archive.security_level === 'confidential' ? '机密' : archive.security_level}</Badge>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">状态</span>
              {(() => { const m = STATUS_MAP[archive.status ?? 'active'] ?? { label: archive.status ?? '未知', variant: 'outline' as const }; return <Badge variant={m.variant}>{m.label}</Badge> })()}
            </div>
            {archive.file_no && (
              <div className="flex justify-between">
                <span className="text-text-secondary">文件编号</span>
                <span>{archive.file_no}</span>
              </div>
            )}
            {archive.volume_no && (
              <div className="flex justify-between">
                <span className="text-text-secondary">卷号</span>
                <span>{archive.volume_no}</span>
              </div>
            )}
            {archive.responsible_person && (
              <div className="flex justify-between">
                <span className="text-text-secondary">责任人</span>
                <span>{archive.responsible_person}</span>
              </div>
            )}
            {archive.doc_date && (
              <div className="flex justify-between">
                <span className="text-text-secondary">文件日期</span>
                <span>{archive.doc_date}</span>
              </div>
            )}
            {archive.page_count && (
              <div className="flex justify-between">
                <span className="text-text-secondary">页数</span>
                <span>{archive.page_count} 页</span>
              </div>
            )}
            {archive.retention_period && (
              <div className="flex justify-between">
                <span className="text-text-secondary">保管期限</span>
                <span>{RETENTION_LABEL[archive.retention_period] ?? archive.retention_period}</span>
              </div>
            )}
            {archive.location && (
              <div className="flex justify-between">
                <span className="text-text-secondary">存放位置</span>
                <span>{archive.location}</span>
              </div>
            )}
            {archive.box_no && (
              <div className="flex justify-between">
                <span className="text-text-secondary">档案盒</span>
                <span>{archive.box_no}</span>
              </div>
            )}
            {archive.keywords && (
              <div>
                <span className="text-text-secondary">关键词</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {archive.keywords.split(',').filter(Boolean).map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{kw.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}
            {archive.description && (
              <div>
                <span className="text-text-secondary">描述</span>
                <p className="mt-1 text-text-secondary">{archive.description}</p>
              </div>
            )}
            {archive.created_at && (
              <div className="flex justify-between">
                <span className="text-text-secondary">创建时间</span>
                <span>{archive.created_at}</span>
              </div>
            )}
            {archive.updated_at && (
              <div className="flex justify-between">
                <span className="text-text-secondary">更新时间</span>
                <span>{archive.updated_at}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧：Tab区域 */}
        <div className="lg:col-span-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="files">文件列表</TabsTrigger>
              <TabsTrigger value="borrows">借阅记录</TabsTrigger>
              <TabsTrigger value="appraisals">鉴定记录</TabsTrigger>
            </TabsList>

            <TabsContent value="files">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">文件列表 ({files.length})</CardTitle>
                  <label htmlFor="field-file-upload" className="cursor-pointer inline-flex items-center">
                    <Button size="sm" disabled={uploading} className="cursor-pointer">
                      <Upload className="size-4" />
                      <span className="ml-1">{uploading ? '上传中...' : '上传文件'}</span>
                    </Button>
                    <input id="field-file-upload" type="file" className="hidden" onChange={handleUpload} />
                  </label>
                </CardHeader>
                <CardContent>
                  {files.length > 0 ? (
                    <div className="space-y-2">
                      {files.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileIcon className="size-5 text-text-secondary" />
                            <div>
                              <p className="text-sm font-medium">{f.original_name ?? f.filename}</p>
                              <p className="text-xs text-text-secondary">
                                {f.file_type ?? '-'} · {f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : '-'}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteFile(f.id)} title="删除">
                            <Trash2 className="size-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
                      暂无文件
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="borrows">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">借阅记录 ({archBorrows.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {archBorrows.length > 0 ? (
                    <div className="space-y-3">
                      {archBorrows.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{b.borrower}</p>
                            <p className="text-xs text-text-secondary">借阅日期: {b.borrow_date} · 预计归还: {b.expected_return_date}</p>
                            {b.purpose && <p className="text-xs text-text-secondary">目的: {b.purpose}</p>}
                          </div>
                          <Badge variant={b.status === 'returned' ? 'success' : b.status === 'overdue' ? 'destructive' : 'warning'}>
                            {b.status === 'returned' ? '已归还' : b.status === 'overdue' ? '逾期' : '借阅中'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
                      暂无借阅记录
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appraisals">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">鉴定记录 ({archAppraisals.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {archAppraisals.length > 0 ? (
                    <div className="space-y-3">
                      {archAppraisals.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{a.appraisal_type}</p>
                            <p className="text-xs text-text-secondary">鉴定日期: {a.appraisal_date} · 鉴定人: {a.appraiser ?? '-'}</p>
                            <p className="text-xs text-text-secondary">结果: {a.result}</p>
                            {a.remark && <p className="text-xs text-text-secondary">备注: {a.remark}</p>}
                          </div>
                          <Badge variant="outline">{a.result}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
                      暂无鉴定记录
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
