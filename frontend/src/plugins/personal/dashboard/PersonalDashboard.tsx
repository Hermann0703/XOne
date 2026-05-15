'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShoppingCart,
  BookOpen,
  Film,
  TrendingUp,
  Heart,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  PageHeader,
  StatCard,
  RightPanel,
  RingChartSection,
  CalendarSection,
  type CalendarDay,
} from '@/components/shared';

// ── 统计指标卡片数据类型 ──
interface StatCardData {
  title: string;
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  trend: number;
  trendLabel: string;
}

// ── 活动记录数据类型 ──
interface ActivityItem {
  id: string;
  action: string;
  module: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

// ── 快速入口数据类型 ──
interface QuickEntry {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

// ── API 响应数据类型 ──
interface DashboardStats {
  shopping_pending: number;
  shopping_total: number;
  reading_total: number;
  reading_in_progress: number;
  reading_completed: number;
  media_total: number;
  media_watched: number;
  health_today_calories: number;
  health_exercise_minutes: number;
  weight_trend: number[];
  assets_net_worth: number;
  assets_month_income: number;
  assets_month_expense: number;
}

interface DashboardApiData {
  stats: DashboardStats;
  recent_reading: Array<{
    id: string;
    title: string;
    progress: number;
    last_read: string;
  }>;
  recent_activities: Array<{
    id: string;
    action: string;
    target: string;
    time: string;
  }>;
}

interface DashboardApiResponse {
  code: number;
  message: string;
  data: DashboardApiData;
}

// ====================================================================
//  硬编码快速入口（不依赖 API，保持静态）
// ====================================================================

const quickEntries: QuickEntry[] = [
  { title: '购物清单', href: '../shopping', icon: ShoppingCart, color: 'hover:text-warning' },
  { title: '藏书阁',   href: '../reading',  icon: BookOpen,    color: 'hover:text-warning' },
  { title: '影音馆',   href: '../media',    icon: Film,        color: 'hover:text-info' },
  { title: '资产管理', href: '../assets',   icon: TrendingUp,  color: 'hover:text-success' },
  { title: '健康管理', href: '../health',   icon: Heart,       color: 'hover:text-destructive' },
];

// ====================================================================
//  工具函数
// ====================================================================

/** 格式化今日日期为中文显示 */
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekDay = weekDays[now.getDay()];
  return `${year}年${month}月${day}日 星期${weekDay}`;
}

/** 根据当前时段返回 i18n 问候语 key */
function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 6)  return 'greeting.night';
  if (hour < 9)  return 'greeting.morning';
  if (hour < 12) return 'greeting.forenoon';
  if (hour < 14) return 'greeting.noon';
  if (hour < 18) return 'greeting.afternoon';
  return 'greeting.evening';
}

/** 生成当月日历数据（含今天高亮 + 活动日标记） */
function getCalendarDays(activityDays: number[]): CalendarDay[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const firstDay = new Date(year, month, 1).getDay(); // 0=周日
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = true;
  const todayDate = now.getDate();

  // 将周日=0 转换为周一=0 的偏移量
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const days: CalendarDay[] = [];

  // 前置空白格
  for (let i = 0; i < startOffset; i++) {
    days.push({ day: 0 });
  }

  // 实际日期
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      day: d,
      isToday: isCurrentMonth && d === todayDate,
      hasActivity: activityDays.includes(d),
    });
  }

  return days;
}

/** 格式化 ISO 时间戳为相对时间 */
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

/** 格式化金额为中文短格式 */
function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '¥0';
  if (value >= 10000) {
    return `¥${(value / 10000).toFixed(1)}万`;
  }
  return `¥${value.toLocaleString('zh-CN')}`;
}

/** 根据模块名获取活动图标和颜色 */
function getActivityIconAndColor(module: string): {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
} {
  const map: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
    '购物清单': { icon: ShoppingCart, color: 'text-warning' },
    '藏书阁': { icon: BookOpen, color: 'text-warning' },
    '影音馆': { icon: Film, color: 'text-info' },
    '资产管理': { icon: TrendingUp, color: 'text-success' },
    '健康管理': { icon: Heart, color: 'text-destructive' },
  };
  return map[module] || { icon: Clock, color: 'text-text-tertiary' };
}

/** 判断是否为当前月份的日期 */
function isCurrentMonthDate(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

// ====================================================================
//  页面组件
// ====================================================================

export default function PersonalDashboard() {
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<DashboardApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  // ── Hooks MUST be called before any early return ──
  const displayName = user?.display_name || user?.username || t('dashboard.personal.greeting');
  const greetingKey = getGreetingKey();
  const today = getTodayString();

  // ── 从 API 获取仪表盘数据 ──
  useEffect(() => {
    setMounted(true);

    const fetchDashboard = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('xone-token') : null;
        const res = await fetch('/api/v1/personal/dashboard', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json: DashboardApiResponse = await res.json();

        if (json.code !== 0) {
          throw new Error(json.message || '请求失败');
        }

        setData(json.data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '加载失败';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // ── 从 API 数据计算统计卡片 ──
  const statCards: StatCardData[] = useMemo(() => {
    const s = data?.stats;
    return [
      {
        title: '购物清单',
        value: String(s?.shopping_pending ?? 0),
        label: '待购项',
        icon: ShoppingCart,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        trend: s?.shopping_total ?? 0,
        trendLabel: '总计',
      },
      {
        title: '藏书阁',
        value: String(s?.reading_in_progress ?? 0),
        label: '在读',
        icon: BookOpen,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        trend: s?.reading_completed ?? 0,
        trendLabel: '已读完',
      },
      {
        title: '影音馆',
        value: String(s?.media_watched ?? 0),
        label: '已看',
        icon: Film,
        color: 'text-info',
        bgColor: 'bg-info/10',
        trend: s?.media_total ?? 0,
        trendLabel: '总计',
      },
      {
        title: '资产管理',
        value: formatCurrency(s?.assets_net_worth),
        label: '总资产',
        icon: TrendingUp,
        color: 'text-success',
        bgColor: 'bg-success/10',
        trend: s?.assets_month_income ?? 0,
        trendLabel: '月收入',
      },
      {
        title: '健康打卡',
        value: String(s?.health_today_calories ?? 0),
        label: '今日卡路里',
        icon: Heart,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        trend: s?.health_exercise_minutes ?? 0,
        trendLabel: '运动分钟',
      },
    ];
  }, [data]);

  // ── 从 API 数据映射最近活动 ──
  const recentActivities: ActivityItem[] = useMemo(() => {
    return (data?.recent_activities || []).map((a) => {
      const { icon, color } = getActivityIconAndColor(a.target);
      return {
        id: a.id,
        action: a.action,
        module: a.target,
        time: formatRelativeTime(a.time),
        icon,
        color,
      };
    });
  }, [data]);

  // ── 环形图数据（基于 stats 模块分布） ──
  const ringChartData = useMemo(() => {
    const s = data?.stats;
    return [
      { label: '购物', value: s?.shopping_pending ?? 0, color: '#f97316' },
      { label: '藏书', value: s?.reading_in_progress ?? 0, color: '#d97706' },
      { label: '影音', value: s?.media_watched ?? 0, color: '#a855f7' },
      { label: '资产', value: 1, color: '#22c55e' },
      { label: '健康', value: s?.health_exercise_minutes ?? 0, color: '#ef4444' },
    ];
  }, [data]);

  // ── 当月有活动的日期（基于 API 数据中的时间戳） ──
  const calendarDays = useMemo(() => {
    const now = new Date();
    const todayDate = now.getDate();

    const activityDaysSet = new Set<number>();
    activityDaysSet.add(todayDate);

    // 从最近阅读记录提取活动日期
    (data?.recent_reading || []).forEach((r) => {
      if (isCurrentMonthDate(r.last_read)) {
        activityDaysSet.add(new Date(r.last_read).getDate());
      }
    });

    // 从最近活动记录提取活动日期
    (data?.recent_activities || []).forEach((a) => {
      if (isCurrentMonthDate(a.time)) {
        activityDaysSet.add(new Date(a.time).getDate());
      }
    });

    return getCalendarDays(Array.from(activityDaysSet));
  }, [data]);

  // 首次渲染返回空，由 page.tsx 的 dynamic() loading 提供骨架屏
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-full">
      {/* ══════════════════════════════════════════════════
          左侧主内容区
          ══════════════════════════════════════════════════ */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* ── 页面标题（使用共享 PageHeader） ── */}
        <PageHeader
          title={`${t(greetingKey)}，${displayName}`}
          description={t('dashboard.personal.subtitle')}
          rightContent={
            <span className="text-xs text-text-secondary sm:text-sm">{today}</span>
          }
          bordered
        />

        {/* ── 加载态 ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-text-secondary">{t('dashboard.personal.loading')}</p>
          </div>
        )}

        {/* ── 错误态 ── */}
        {!loading && error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="size-7 text-destructive" />
              </div>
              <p className="text-sm font-medium text-text-primary mb-1">
                {t('dashboard.personal.error')}
              </p>
              <p className="text-xs text-text-secondary max-w-xs">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* ── 数据就绪态 ── */}
        {!loading && !error && (
          <>
            {/* ── 统计卡片（使用共享 StatCard） ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {statCards.map((stat) => (
                <StatCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  unit={stat.label}
                  change={stat.trend}
                  changeLabel={stat.trendLabel}
                  icon={stat.icon}
                  iconColor={stat.color}
                  iconBg={stat.bgColor}
                />
              ))}
            </div>

            {/* ── 快速入口区 ── */}
            <div className="flex items-center gap-2">
              <span className="mr-1 text-xs font-medium text-text-secondary">
                {t('dashboard.personal.quickActions')}
              </span>
              {quickEntries.map((entry) => (
                <Link
                  key={entry.href}
                  href={entry.href}
                  title={entry.title}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-card text-text-secondary transition-colors duration-200 hover:border-primary/30 hover:text-primary ${entry.color} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                >
                  <entry.icon className="h-4 w-4" />
                </Link>
              ))}
            </div>

            {/* ── 最近活动摘要 ── */}
            <Card>
              <CardHeader className="pb-3">
                <h2 className="tracking-tight flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4 text-text-secondary" />
                  {t('dashboard.personal.recentActivity')}
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-bg-card p-3 transition-colors duration-150 hover:bg-muted/50"
                    >
                      {/* 模块图标 */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <activity.icon className={`h-4 w-4 ${activity.color}`} />
                      </div>
                      {/* 活动描述 */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text-primary">
                          {activity.action}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {activity.module}
                        </p>
                      </div>
                      {/* 时间戳 */}
                      <span className="shrink-0 text-xs text-text-secondary/60">
                        {activity.time}
                      </span>
                    </div>
                  ))
                ) : (
                  /* 空态 */
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                      <Clock className="size-7 text-text-secondary/50" />
                    </div>
                    <p className="text-sm font-medium text-text-primary mb-1">
                      {t("dashboard.empty.noActivity")}
                    </p>
                    <p className="text-xs text-text-secondary max-w-xs">
                      {t("dashboard.empty.noActivityDesc")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          右侧面板（环形图 + 日历）
          ══════════════════════════════════════════════════ */}
      <RightPanel>
        {/* 模块分布环形图 */}
        <Card className="border-none shadow-none">
          <CardHeader className="flex flex-row items-center justify-between px-0 pb-2 pt-0">
            <CardTitle className="text-sm font-semibold">{t('dashboard.rightPanel.title')}</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <RingChartSection data={ringChartData} />
          </CardContent>
        </Card>

        {/* 当月日历 */}
        <Card className="border-none shadow-none">
          <CardHeader className="flex flex-row items-center justify-between px-0 pb-2 pt-0">
            <CardTitle className="text-sm font-semibold">{t('dashboard.rightPanel.chartTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <CalendarSection days={calendarDays} />
          </CardContent>
        </Card>
      </RightPanel>
    </div>
  );
}
