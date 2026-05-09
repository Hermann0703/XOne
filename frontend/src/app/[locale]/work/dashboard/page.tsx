'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderOpen,
  FileText,
  Package,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
// ─── 共享组件导入 ──────────────────────────────────────────
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, type StatCardProps } from '@/components/shared/StatCard';
import { RightPanel, RingChartSection, CalendarSection, type CalendarDay } from '@/components/shared/RightPanel';

// ─── 类型定义 ────────────────────────────────────────────

/** 项目进度条目 */
interface ProjectItem {
  id: string;
  name: string;
  progress: number; // 0-100
  deadline: string;
  status: '进行中' | '已完成' | '已延期' | '待启动';
}

/** 最近活动条目 */
interface ActivityItem {
  id: string;
  action: string;
  target: string;
  time: string;
  user: string;
}

// ─── 占位数据（后端 API 就绪后替换） ──────────────────────

const projects: ProjectItem[] = [
  {
    id: '1',
    name: 'XOne 平台 v2.0 重构',
    progress: 72,
    deadline: '2026-06-15',
    status: '进行中',
  },
  {
    id: '2',
    name: '客户门户移动端适配',
    progress: 45,
    deadline: '2026-06-30',
    status: '进行中',
  },
  {
    id: '3',
    name: '合同审批流自动化',
    progress: 90,
    deadline: '2026-05-20',
    status: '进行中',
  },
  {
    id: '4',
    name: '数据归档与备份方案',
    progress: 100,
    deadline: '2026-04-30',
    status: '已完成',
  },
  {
    id: '5',
    name: '知识库 API 集成',
    progress: 30,
    deadline: '2026-07-10',
    status: '已延期',
  },
];

const recentActivities: ActivityItem[] = [
  {
    id: '1',
    action: '更新了项目进度',
    target: 'XOne 平台 v2.0 重构',
    time: '10 分钟前',
    user: '张明',
  },
  {
    id: '2',
    action: '签署了合同',
    target: '2026年度服务协议',
    time: '1 小时前',
    user: '李娜',
  },
  {
    id: '3',
    action: '上传了文档',
    target: 'Q1 财报分析.pdf',
    time: '3 小时前',
    user: '王磊',
  },
  {
    id: '4',
    action: '完成了调度任务',
    target: '服务器巡检',
    time: '5 小时前',
    user: '赵婷',
  },
  {
    id: '5',
    action: '创建了新合同',
    target: '供应商框架协议',
    time: '昨天',
    user: '李娜',
  },
  {
    id: '6',
    action: '归档了项目文档',
    target: '数据归档与备份方案',
    time: '昨天',
    user: '张明',
  },
];

// ─── 右侧面板数据 ──────────────────────────────────────────

/** 项目状态分布数据（环形图） */
const ringChartData = [
  { label: '进行中', value: 3, color: '#3b82f6' },
  { label: '已完成', value: 1, color: '#22c55e' },
  { label: '已延期', value: 1, color: '#ef4444' },
  { label: '待启动', value: 0, color: '#9ca3af' },
];

/** 生成当月日历数据 */
function buildCalendarDays(year: number, month: number, deadlineDays: number[]): CalendarDay[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // JS getDay(): 0=周日, 转换为周一=0
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;
  const todayDate = today.getDate();

  const days: CalendarDay[] = [];

  // 前置空白格
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ day: 0 });
  }

  // 当月日期
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      day: d,
      isToday: isCurrentMonth && d === todayDate,
      hasActivity: deadlineDays.includes(d),
    });
  }

  return days;
}

// ─── 子组件（保留） ──────────────────────────────────────

/** 项目进度概览 */
function ProjectOverview({ data }: { data: ProjectItem[] }) {
  const t = useTranslations();
  // 状态徽章配置
  const statusConfig: Record<
    ProjectItem['status'],
    { variant: 'success' | 'warning' | 'destructive' | 'outline'; icon: React.ComponentType<{ className?: string }> }
  > = {
    '进行中': { variant: 'outline', icon: Clock },
    '已完成': { variant: 'success', icon: CheckCircle2 },
    '已延期': { variant: 'destructive', icon: AlertCircle },
    '待启动': { variant: 'warning', icon: Clock },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{t('dashboard.work.projectProgress')}</CardTitle>
        <button className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {t('common.viewAll')} <ArrowUpRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="p-0">
        {/* 表头 */}
        <div className="grid grid-cols-12 gap-2 border-b border-border px-6 pb-2 text-xs font-medium text-text-secondary">
          <span className="col-span-5">{t('project.detail.name')}</span>
          <span className="col-span-2">{t('project.detail.progress')}</span>
          <span className="col-span-2">{t('project.detail.endDate')}</span>
          <span className="col-span-3">{t('project.detail.status')}</span>
        </div>
        {/* 数据行 */}
        <div className="divide-y divide-border">
          {data.map((project) => {
            const status = statusConfig[project.status];
            const StatusIcon = status.icon;
            return (
              <div
                key={project.id}
                className="grid grid-cols-12 items-center gap-2 px-6 py-3 text-sm transition-colors hover:bg-muted/50"
              >
                {/* 项目名 */}
                <span className="col-span-5 truncate font-medium text-text-primary">
                  {project.name}
                </span>
                {/* 进度条 */}
                <div className="col-span-2 flex items-center gap-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        project.progress === 100
                          ? 'bg-green-500'
                          : project.status === '已延期'
                            ? 'bg-red-400'
                            : 'bg-primary'
                      }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-text-secondary">
                    {project.progress}%
                  </span>
                </div>
                {/* 截止日期 */}
                <span className="col-span-2 text-text-secondary">{project.deadline}</span>
                {/* 状态 */}
                <div className="col-span-3">
                  <Badge variant={status.variant} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {project.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** 最近活动摘要 */
function RecentActivity({ data }: { data: ActivityItem[] }) {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{t('dashboard.rightPanel.todayActivity')}</CardTitle>
        <button className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {t('common.viewAll')} <ArrowUpRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {data.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
            >
              {/* 时间轴圆点 */}
              <div className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary/40" />
              </div>
              {/* 活动内容 */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">
                  <span className="font-medium">{activity.user}</span>
                  {' '}
                  <span className="text-text-secondary">{activity.action}</span>
                  {' '}
                  <span className="font-medium">{activity.target}</span>
                </p>
              </div>
              {/* 时间 */}
              <span className="shrink-0 text-xs text-text-secondary/70">{activity.time}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 骨架屏 ──────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="space-y-1 border-b border-border px-6 pb-4 pt-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {/* 主内容 + 右侧面板 */}
      <div className="flex flex-1">
        <div className="flex-1 space-y-6 overflow-y-auto">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-card border border-border bg-bg-card p-5">
                <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
                <Skeleton className="mb-1 h-7 w-20" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
          {/* Project overview */}
          <div className="rounded-card border border-border bg-bg-card p-4">
            <Skeleton className="mb-4 h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-10 w-full" />
            ))}
          </div>
          {/* Recent activity */}
          <div className="rounded-card border border-border bg-bg-card p-4">
            <Skeleton className="mb-4 h-5 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-9 w-full" />
            ))}
          </div>
        </div>
        {/* 右侧面板骨架 */}
        <div className="w-80 shrink-0 border-l border-border bg-bg-card p-4">
          <Skeleton className="mb-4 h-5 w-20" />
          <Skeleton className="mx-auto mb-4 h-28 w-28 rounded-full" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mt-6 mb-4 h-5 w-20" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

// ─── 页面主体 ────────────────────────────────────────────

export default function WorkDashboardPage() {
  const t = useTranslations();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <DashboardSkeleton />;
  }

  const displayName = user?.display_name || user?.username || '同事';

  // 当前日期，格式: "2026年5月9日 星期六"
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // 构建当月日历（含截止日标记）
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  // 提取当月有截止日的日期号
  const deadlineDays = projects
    .map((p) => {
      const d = new Date(p.deadline);
      if (d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth) {
        return d.getDate();
      }
      return null;
    })
    .filter((d): d is number => d !== null);
  const calendarDays = buildCalendarDays(currentYear, currentMonth, deadlineDays);

  const statCards: StatCardProps[] = [
    {
      title: t('dashboard.statCards.activeProjects'),
      value: 6,
      unit: '个',
      change: 2,
      icon: FolderOpen,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      title: t('dashboard.statCards.completedTasks'),
      value: 3,
      unit: '份',
      change: -1,
      icon: FileText,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
    },
    {
      title: t('dashboard.statCards.documents'),
      value: 1248,
      unit: '个',
      change: 128,
      icon: Package,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
    },
    {
      title: t('dashboard.statCards.teamMembers'),
      value: 156,
      unit: '篇',
      change: 12,
      icon: BookOpen,
      iconColor: 'text-cyan-600',
      iconBg: 'bg-cyan-50',
    },
    {
      title: t('dashboard.statCards.thisMonth'),
      value: 42,
      unit: '项',
      change: 0,
      icon: Calendar,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* ── 页面标题（共享组件 PageHeader） ── */}
      <PageHeader
        title={
          <>
            {t('dashboard.work.greeting')}
          </>
        }
        description={t('dashboard.work.subtitle')}
        rightContent={
          <span className="text-sm text-text-secondary">{dateStr}</span>
        }
        bordered
      />

      {/* ── 主内容 + 右侧面板 ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧主内容 */}
        <div className="flex-1 space-y-6 overflow-y-auto">
          {/* ── 统计指标卡片（共享组件 StatCard） ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {statCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>

          {/* ── 项目进度概览 ── */}
          <ProjectOverview data={projects} />

          {/* ── 最近活动摘要 ── */}
          <RecentActivity data={recentActivities} />
        </div>

        {/* ── 右侧面板（共享组件 RightPanel） ── */}
        <RightPanel>
          {/* 项目状态分布环形图 */}
          <Card className="border-none shadow-none">
            <CardHeader className="px-0 pb-2 pt-0">
              <CardTitle className="text-sm font-semibold">{t('dashboard.rightPanel.chartTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <RingChartSection data={ringChartData} total={projects.length} />
            </CardContent>
          </Card>

          {/* 当月日历 */}
          <Card className="border-none shadow-none">
            <CardHeader className="px-0 pb-2 pt-0">
              <CardTitle className="text-sm font-semibold">
                {t('calendar.monthNames')[currentMonth - 1]}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <CalendarSection days={calendarDays} />
            </CardContent>
          </Card>
        </RightPanel>
      </div>
    </div>
  );
}
