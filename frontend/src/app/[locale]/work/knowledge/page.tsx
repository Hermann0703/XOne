'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, MessageSquare, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared'

const DocumentList = dynamic(() => import('@/plugins/builtin/work/knowledge/DocumentList'), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-text-secondary" />
    </div>
  ),
})

const ChatPanel = dynamic(() => import('@/plugins/builtin/work/knowledge/ChatPanel'), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-text-secondary" />
    </div>
  ),
})

export default function KnowledgePage() {
  const t = useTranslations()
  const [tab, setTab] = useState('documents')

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('knowledge.title')}
        description={t('knowledge.description')}
      />
      <div className="px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="documents">
              <FileText className="size-4 mr-1.5" />
              {t('knowledge.documents')}
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="size-4 mr-1.5" />
              {t('knowledge.chat')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === 'documents' ? <DocumentList /> : <ChatPanel />}
    </div>
  )
}
