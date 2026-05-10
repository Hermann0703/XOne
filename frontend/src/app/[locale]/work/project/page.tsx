'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Layout, Calendar, Flag, Plus, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/plugins/builtin/work/project/store';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const KanbanBoard = dynamic(() => import('@/plugins/builtin/work/project/KanbanBoard'), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const GanttChart = dynamic(() => import('@/plugins/builtin/work/project/GanttChart'), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const MilestoneList = dynamic(() => import('@/plugins/builtin/work/project/MilestoneList'), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

type ViewMode = 'kanban' | 'gantt' | 'milestones';

export default function ProjectPage() {
  const t = useTranslations();
  const {
    projects,
    loading,
    fetchProjects,
    loadProjectData,
    createProject,
    setCurrentProject,
  } = useProjectStore();

  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  // 初始加载项目列表
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 当项目列表加载完毕，自动选中第一个项目
  useEffect(() => {
    if (projects.length > 0 && !currentProjectId) {
      setCurrentProject(projects[0].id);
    }
  }, [projects, currentProjectId, setCurrentProject]);

  // 当选中项目变化时，加载该项目数据
  useEffect(() => {
    if (currentProjectId) {
      loadProjectData(currentProjectId);
    }
  }, [currentProjectId, loadProjectData]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || creating) return;
    setCreating(true);
    try {
      await createProject({
        name: newProjectName.trim(),
        description: '',
        status: 'active',
        startDate: '',
        endDate: '',
      });
      setNewProjectName('');
      setCreateDialogOpen(false);
    } catch {
      // 错误已在 store 中处理
    } finally {
      setCreating(false);
    }
  };

  const tabs: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'kanban', icon: <Layout className="size-4" />, label: t('project.board.todo') || '看板' },
    { mode: 'gantt', icon: <Calendar className="size-4" />, label: '甘特图' },
    { mode: 'milestones', icon: <Flag className="size-4" />, label: t('project.milestone.title') || '里程碑' },
  ];

  // 空状态：无项目
  if (!loading && projects.length === 0) {
    return (
      <>
        <PageHeader title={t('project.title')} description="管理项目任务与进度" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-muted p-5">
            <Layout className="size-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            {t('project.noProjects') || '暂无项目'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            创建您的第一个项目，开始管理任务与进度
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            {t('project.createProject') || t('project.addProject')}
          </Button>
        </div>

        {/* 创建项目对话框 */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('project.createProject') || t('project.addProject')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder={t('project.detail.namePlaceholder')}
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || creating}>
                {creating ? t('common.saving') : t('common.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('project.title')} description="管理项目任务与进度" />

      {/* 工具栏：项目选择器 + Tab 切换 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        {/* 项目选择器 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t('project.selectProject') || '选择项目'}:
          </span>
          <select
            className="h-9 rounded-md border border-input bg-bg-card px-3 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={currentProjectId || ''}
            onChange={(e) => {
              const id = e.target.value;
              if (id) setCurrentProject(id);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            title={t('project.createProject') || t('project.addProject')}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Tab 切换 */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.mode}
              onClick={() => setViewMode(tab.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === tab.mode
                  ? 'bg-bg-card text-text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-text-primary'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      {loading && !currentProjectId ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : currentProjectId ? (
        <>
          {viewMode === 'kanban' && <KanbanBoard projectId={currentProjectId} />}
          {viewMode === 'gantt' && <GanttChart projectId={currentProjectId} />}
          {viewMode === 'milestones' && <MilestoneList projectId={currentProjectId} />}
        </>
      ) : (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">{t('project.selectProject') || '请选择一个项目'}</p>
        </div>
      )}

      {/* 创建项目对话框（非空状态下的复用） */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('project.createProject') || t('project.addProject')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t('project.detail.namePlaceholder')}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || creating}>
              {creating ? t('common.saving') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
