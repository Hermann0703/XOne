'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─── 类型定义 ──────────────────────────────────────────────

export interface StatCardProps {
  /** 卡片标题（显示在底部） */
  title: string;
  /** 核心数值 */
  value: number | string;
  /** 数值单位 */
  unit?: string;
  /** 变化量：正数上升，负数下降，0 或 undefined 持平 */
  change?: number;
  /** 变化量说明文字 */
  changeLabel?: string;
  /** 图标组件 */
  icon: React.ComponentType<{ className?: string }>;
  /** 图标颜色 Tailwind 类名 */
  iconColor?: string;
  /** 图标背景色 Tailwind 类名 */
  iconBg?: string;
  /** 额外 CSS 类 */
  className?: string;
  /** 点击回调 */
  onClick?: () => void;
}

// ─── 工具函数 ──────────────────────────────────────────────

function formatValue(value: number | string): string {
  if (typeof value === 'string') return value;
  if (value >= 10000) {
    return (value / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  }
  return value.toLocaleString();
}

function renderTrend(change: number | undefined, changeLabel?: string) {
  if (change === undefined || change === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-text-secondary">
        <Minus className="h-3 w-3" />—
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-700">
        <TrendingUp className="h-3 w-3" />+{change}
        {changeLabel && <span className="ml-0.5 text-text-secondary/50">{changeLabel}</span>}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-600">
        <TrendingDown className="h-3 w-3" />
        {change}
        {changeLabel && <span className="ml-0.5 text-text-secondary/50">{changeLabel}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-text-secondary">
      <Minus className="h-3 w-3" />持平
      {changeLabel && <span className="ml-0.5 text-text-secondary/50">{changeLabel}</span>}
    </span>
  );
}

// ─── 常量 ──────────────────────────────────────────────────

const KEY_ENTER = 'Enter';
const KEY_SPACE = ' ';

// ─── 组件 ──────────────────────────────────────────────────

export function StatCard({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
  className,
  onClick,
}: StatCardProps) {
  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === KEY_ENTER || e.key === KEY_SPACE) {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <Card
      className={cn(
        'transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-card',
        onClick && 'cursor-pointer',
        className,
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* 图标 + 趋势 */}
        <div className="mb-3 flex items-center justify-between">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          {renderTrend(change, changeLabel)}
        </div>

        {/* 数值 + 单位 + 标题 */}
        <p className="text-2xl font-bold tracking-tight text-text-primary">
          {formatValue(value)}
          {unit && (
            <span className="ml-1 text-sm font-normal text-text-secondary">{unit}</span>
          )}
        </p>
        <p className="mt-0.5 text-sm text-text-secondary">{title}</p>
      </CardContent>
    </Card>
  );
}
