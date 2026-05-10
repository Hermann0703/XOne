'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Database, ListOrdered, Activity, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import DataSourceList from '@/plugins/builtin/work/dispatch/DataSourceList'

const TaskList = dynamic(() => import('@/plugins/builtin/work/dispatch/TaskList'), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-text-secondary" />
    </div>
  ),
})

const MonitorPanel = dynamic(() => import('@/plugins/builtin/work/dispatch/MonitorPanel'), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-text-secondary" />
    </div>
  ),
})

export default function DispatchPage() {
  const t = useTranslations()
  const [tab, setTab] = useState('sources')

  return (
    <div className="space-y-4">
      <PageHeader title={t('dispatch.title')} />
      <div className="px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="sources">
              <Database className="size-4 mr-1.5" />
              {t('dispatch.sources')}
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <ListOrdered className="size-4 mr-1.5" />
              {t('dispatch.tasks')}
            </TabsTrigger>
            <TabsTrigger value="monitor">
              <Activity className="size-4 mr-1.5" />
              {t('dispatch.monitor')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sources">
            <DataSourceList />
          </TabsContent>
          <TabsContent value="tasks">
            <TaskList />
          </TabsContent>
          <TabsContent value="monitor">
            <MonitorPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
