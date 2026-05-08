'use client';

import { useState, useEffect } from 'react';
import KanbanBoard from '@/plugins/builtin/work/project/KanbanBoard';
import { useProjectStore } from '@/plugins/builtin/work/project/store';

export default function ProjectPage() {
  const projects = useProjectStore((s) => s.projects);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (projects?.length) {
      setProjectId(projects[0].id);
    }
  }, [projects]);

  if (!projectId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">项目管理</h1>
        <p className="text-muted-foreground">暂无项目，请先创建项目。</p>
      </div>
    );
  }

  return <KanbanBoard projectId={projectId} />;
}
