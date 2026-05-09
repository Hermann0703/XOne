'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import KanbanBoard from '@/plugins/builtin/work/project/KanbanBoard';
import { useProjectStore } from '@/plugins/builtin/work/project/store';
import { PageHeader } from '@/components/shared';

export default function ProjectPage() {
  const t = useTranslations();
  const projects = useProjectStore((s) => s.projects);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (projects?.length) {
      setProjectId(projects[0].id);
    }
  }, [projects]);

  return (
    <>
      <PageHeader title={t('project.title')} description="管理项目任务与进度" />
      {!projectId ? (
        <div>
          <p className="text-muted-foreground">暂无项目，请先创建项目。</p>
        </div>
      ) : (
        <KanbanBoard projectId={projectId} />
      )}
    </>
  );
}
