'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

// ─── 月份名称（不用 i18n 数组，避免 use-intl 数组消息报错） ──
const MONTH_NAMES: Record<string, string[]> = {
  zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

// ─── API 响应类型 ────────────────────────────────────────

interface DashboardStats {
  active_projects: number;
  completed_projects: number;
  pending_tasks: number;
  overdue_tasks: number;
  contract_count: number;
  expiring_contracts: number;
  archive_count: number;
  pending_borrows: number;
  dispatch_count: number;
  pending_dispatch: number;
}

interface ApiProjectProgress {
  id: string;
  name: string;
  progress: number; // 0-100
  deadline: string | null;
  status: 'active' | 'completed' | 'archived';
}

interface ApiActivity {
  id: string;
  action: string;
  target: string;
  time: string; // ISO timestamp
  user: string;
}

interface DashboardApiResponse {
  code: number;
  message: string;
  data: {
    stats: DashboardStats;
    project_progress: ApiProjectProgress[];
    recent_activities: ApiActivity[];
  };
}

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

// ─── 工具函数 ────────────────────────────────────────────

/** 将 API 状态映射为 UI 中文状态 */
function mapApiStatus(apiStatus: ApiProjectProgress['status']): ProjectItem['status'] {
  switch (apiStatus) {
    case 'active':
      return '进行中';
    case 'completed':
      return '已完成';
    case 'archived':
      return '已延期';
    default:
      return '待启动';
  }
}

/** 将 ISO 时间戳转换为相对时间描述（中文） */
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前`;
  return `${Math.floor(diffDays / 365)} 年前`;
}

// ─── 右侧面板数据 ──────────────────────────────────────────

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

// ─── 子组件 ──────────────────────────────────────────────

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
        <CardTitle as="h2" className="text-base font-semibold">{t('dashboard.work.projectProgress')}</CardTitle>
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
                          ? 'bg-success'
                          : project.status === '已延期'
                            ? 'bg-destructive'
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
        <CardTitle as="h2" className="text-base font-semibold">{t('dashboard.rightPanel.todayActivity')}</CardTitle>
        <button className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {t('common.viewAll')} <ArrowUpRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
              <Clock className="size-7 text-text-secondary/50" />
            </div>
            <p className="text-sm text-text-secondary">
              {t("dashboard.work.noActivity")}
            </p>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

// ─── 页面主体 ────────────────────────────────────────────

export default function WorkDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);

  // ─── API 数据状态 ────────────────────────────────────────
  const [apiData, setApiData] = useState<DashboardApiResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 客户端挂载标记
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取仪表盘数据
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);

        const token = typeof window !== 'undefined' ? localStorage.getItem('xone-token') : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/v1/work/dashboard', { headers });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const json: DashboardApiResponse = await res.json();
        if (json.code !== 0) {
          throw new Error(json.message || '请求失败');
        }

        if (!cancelled) {
          setApiData(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  if (!mounted) {
    return null;
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

  // ─── 从 API 数据派生 UI 数据 ──────────────────────────────

  // 映射项目进度
  const projects: ProjectItem[] = (apiData?.project_progress || []).map((p) => ({
    id: p.id,
    name: p.name,
    progress: p.progress,
    deadline: p.deadline || '未设定',
    status: mapApiStatus(p.status),
  }));

  // 映射最近活动
  const recentActivities: ActivityItem[] = (apiData?.recent_activities || []).map((a) => ({
    ...a,
    time: formatRelativeTime(a.time),
  }));

  // 项目状态分布数据（环形图）—— 从实际数据动态计算
  const ringChartData = [
    { label: '进行中', value: projects.filter((p) => p.status === '进行中').length, color: '#3b82f6' },
    { label: '已完成', value: projects.filter((p) => p.status === '已完成').length, color: '#22c55e' },
    { label: '已延期', value: projects.filter((p) => p.status === '已延期').length, color: '#ef4444' },
    { label: '待启动', value: projects.filter((p) => p.status === '待启动').length, color: '#9ca3af' },
  ];

  // 构建当月日历（含截止日标记）
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  // 提取当月有截止日的日期号
  const deadlineDays = projects
    .map((p) => {
      const d = new Date(p.deadline);
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth) {
        return d.getDate();
      }
      return null;
    })
    .filter((d): d is number => d !== null);
  const calendarDays = buildCalendarDays(currentYear, currentMonth, deadlineDays);

  // 统计卡片数据
  const stats = apiData?.stats;
  const statCards: StatCardProps[] = [
    {
      title: t('dashboard.statCards.activeProjects'),
      value: stats?.active_projects ?? 0,
      unit: '个',
      change: stats?.completed_projects ?? undefined,
      icon: FolderOpen,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      title: t('dashboard.statCards.completedTasks'),
      value: stats?.contract_count ?? 0,
      unit: '份',
      change: stats?.expiring_contracts ?? undefined,
      icon: FileText,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      title: t('dashboard.statCards.documents'),
      value: stats?.archive_count ?? 0,
      unit: '个',
      change: stats?.pending_borrows ?? undefined,
      icon: Package,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
    },
    {
      title: t('dashboard.statCards.teamMembers'),
      value: stats?.dispatch_count ?? 0,
      unit: '篇',
      change: stats?.pending_dispatch ?? undefined,
      icon: BookOpen,
      iconColor: 'text-info',
      iconBg: 'bg-info/10',
    },
    {
      title: t('dashboard.statCards.thisMonth'),
      value: (stats?.pending_tasks ?? 0) + (stats?.overdue_tasks ?? 0),
      unit: '项',
      change: stats?.overdue_tasks ?? undefined,
      icon: Calendar,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
    },
  ];

  // ─── 加载态 ──────────────────────────────────────────────
  if (loading && !apiData) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title={<>{t('dashboard.work.greeting')}</>}
          description={t('dashboard.work.subtitle')}
          rightContent={
            <span className="text-sm text-text-secondary">{dateStr}</span>
          }
          bordered
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-text-secondary">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── 错误态 ──────────────────────────────────────────────
  if (error && !apiData) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title={<>{t('dashboard.work.greeting')}</>}
          description={t('dashboard.work.subtitle')}
          rightContent={
            <span className="text-sm text-text-secondary">{dateStr}</span>
          }
          bordered
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                // 重新触发 effect
                setMounted(false);
                setTimeout(() => setMounted(true), 0);
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 正常渲染 ────────────────────────────────────────────
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
              <CardTitle as="h2" className="text-sm font-semibold">{t('dashboard.rightPanel.chartTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <RingChartSection data={ringChartData} total={projects.length} />
            </CardContent>
          </Card>

          {/* 当月日历 */}
          <Card className="border-none shadow-none">
            <CardHeader className="px-0 pb-2 pt-0">
              <CardTitle as="h2" className="text-sm font-semibold">
                {MONTH_NAMES[locale]?.[currentMonth - 1] || MONTH_NAMES['zh'][currentMonth - 1]}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <CalendarSection days={calendarDays} />
              {deadlineDays.length === 0 && (
                <p className="text-center text-xs text-text-secondary/60 mt-3">
                  {t("dashboard.work.noDeadlines")}
                </p>
              )}
            </CardContent>
          </Card>
        </RightPanel>
      </div>
    </div>
  );
}
