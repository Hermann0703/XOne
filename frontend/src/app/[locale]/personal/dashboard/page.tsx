'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingCart,
  BookOpen,
  Film,
  TrendingUp,
  Heart,
  Clock,
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

// ====================================================================
//  硬编码占位数据 — 后续接入真实统计 API 后替换
// ====================================================================

const statCards: StatCardData[] = [
  {
    title: '购物清单',
    value: '12',
    label: '待购项',
    icon: ShoppingCart,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    trend: 3,
    trendLabel: '较上周',
  },
  {
    title: '藏书阁',
    value: '45',
    label: '已读本',
    icon: BookOpen,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    trend: 5,
    trendLabel: '本月新增',
  },
  {
    title: '影音馆',
    value: '8',
    label: '在看部',
    icon: Film,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    trend: -2,
    trendLabel: '较上周',
  },
  {
    title: '资产管理',
    value: '¥128,500',
    label: '总资产',
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    trend: 2.4,
    trendLabel: '本月收益',
  },
  {
    title: '健康打卡',
    value: '18',
    label: '本月天',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    trend: 4,
    trendLabel: '较上月',
  },
];

const recentActivities: ActivityItem[] = [
  {
    id: '1',
    action: '添加了购物项「有机牛奶」',
    module: '购物清单',
    time: '10 分钟前',
    icon: ShoppingCart,
    color: 'text-orange-500',
  },
  {
    id: '2',
    action: '记录了《三体》阅读笔记',
    module: '藏书阁',
    time: '2 小时前',
    icon: BookOpen,
    color: 'text-amber-600',
  },
  {
    id: '3',
    action: '标记《奥本海默》为已看',
    module: '影音馆',
    time: '昨天',
    icon: Film,
    color: 'text-purple-500',
  },
  {
    id: '4',
    action: '更新了基金持仓数据',
    module: '资产管理',
    time: '昨天',
    icon: TrendingUp,
    color: 'text-green-500',
  },
  {
    id: '5',
    action: '完成今日运动打卡',
    module: '健康管理',
    time: '2 天前',
    icon: Heart,
    color: 'text-red-500',
  },
];

const quickEntries: QuickEntry[] = [
  { title: '购物清单', href: '../shopping', icon: ShoppingCart, color: 'hover:text-orange-500' },
  { title: '藏书阁',   href: '../reading',  icon: BookOpen,    color: 'hover:text-amber-600' },
  { title: '影音馆',   href: '../media',    icon: Film,        color: 'hover:text-purple-500' },
  { title: '资产管理', href: '../assets',   icon: TrendingUp,  color: 'hover:text-green-500' },
  { title: '健康管理', href: '../health',   icon: Heart,       color: 'hover:text-red-500' },
];

// ====================================================================
//  环形图数据（基于 statCards 模块分布）
// ====================================================================

const ringChartData = [
  { label: '购物', value: 12, color: '#f97316' },
  { label: '藏书', value: 45, color: '#d97706' },
  { label: '影音', value: 8,  color: '#a855f7' },
  { label: '资产', value: 1,  color: '#22c55e' },
  { label: '健康', value: 18, color: '#ef4444' },
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

// ====================================================================
//  骨架屏 — 匹配仪表盘布局（左主内容 + RightPanel）
// ====================================================================

function DashboardSkeleton() {
  return (
    <div className="flex h-full">
      {/* 左侧主内容 */}
      <div className="flex-1 space-y-6">
        {/* 标题区域骨架 */}
        <div className="flex flex-col gap-1 border-b border-border px-6 pt-6 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-4 w-36" />
        </div>

        {/* 统计卡片骨架 — 桌面 5 列，移动端 2 列 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-card border border-border bg-bg-card p-4">
              <div className="flex items-start justify-between">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-8 w-20" />
              <Skeleton className="mt-1 h-4 w-16" />
            </div>
          ))}
        </div>

        {/* 快速入口骨架 */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-14" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-lg" />
          ))}
        </div>

        {/* 活动列表骨架 */}
        <div className="rounded-card border border-border bg-bg-card p-4">
          <Skeleton className="mb-4 h-6 w-24" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* 右侧面板骨架 */}
      <div className="w-80 shrink-0 border-l border-border bg-bg-card px-4 py-6">
        <Skeleton className="mb-4 h-5 w-20" />
        <Skeleton className="mx-auto mb-3 h-28 w-28 rounded-full" />
        <Skeleton className="mb-4 h-4 w-full" />
        <Skeleton className="mb-6 h-5 w-20" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ====================================================================
//  页面组件
// ====================================================================

export default function PersonalDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations();

  // ── Hooks MUST be called before any early return ──
  const displayName = user?.display_name || user?.username || t('dashboard.personal.greeting');
  const greetingKey = getGreetingKey();
  const today = getTodayString();

  // 当月有活动的日期（基于 recentActivities 推断的示例数据）
  const calendarDays = useMemo(() => {
    const now = new Date();
    const todayDate = now.getDate();
    // 模拟：今天、3天前、7天前、14天前、21天前有活动
    const activityDays = [
      todayDate,
      Math.max(1, todayDate - 3),
      Math.max(1, todayDate - 7),
      Math.max(1, todayDate - 14),
      Math.max(1, todayDate - 21),
    ];
    return getCalendarDays(activityDays);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 首次渲染显示骨架屏，避免 hydration 闪烁
  if (!mounted) {
    return <DashboardSkeleton />;
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
              <div className="py-8 text-center text-sm text-text-secondary">
                {t('common.empty')}
              </div>
            )}
          </CardContent>
        </Card>
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
