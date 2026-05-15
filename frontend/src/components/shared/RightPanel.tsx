'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

// ─── 类型定义 ──────────────────────────────────────────────

export interface RightPanelSection {
  /** 区块标题 */
  title: string;
  /** 区块内容 */
  content: ReactNode;
  /** 右侧操作区（如"查看全部"按钮） */
  action?: ReactNode;
}

export interface RightPanelProps {
  /** 面板区块列表 */
  sections?: RightPanelSection[];
  /** 自定义内容（覆盖 sections，直接渲染） */
  children?: ReactNode;
  /** 面板宽度 */
  width?: string;
  /** 额外 CSS 类 */
  className?: string;
}

// ─── 组件 ──────────────────────────────────────────────────

export function RightPanel({
  sections = [],
  children,
  width = 'w-80',
  className,
}: RightPanelProps) {
  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-bg-card px-4 py-6',
        width,
        className,
      )}
    >
      {children
        ? children
        : sections.map((section, idx) => (
            <Card key={idx} className="border-none shadow-none">
              <CardHeader className="flex flex-row items-center justify-between px-0 pb-2 pt-0">
                <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                {section.action}
              </CardHeader>
              <CardContent className="px-0 pb-0">{section.content}</CardContent>
            </Card>
          ))}
    </aside>
  );
}

// ─── 预置区块（可直接使用） ────────────────────────────────

export interface RingChartData {
  label: string;
  value: number;
  color: string;
}

export function RingChartSection({ data, total }: { data: RingChartData[]; total?: number }) {
  const sum = total ?? data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 简易环形图 — 用 SVG 实现，无外部依赖 */}
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          {data.map((item, idx) => {
            const prevSum = data.slice(0, idx).reduce((acc, d) => acc + d.value, 0);
            const pct = sum > 0 ? item.value / sum : 0;
            const dash = pct * 100;
            const offset = sum > 0 ? 100 - (prevSum / sum) * 100 : 0;

            return (
              <circle
                key={idx}
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke={item.color}
                strokeWidth="3.5"
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            );
          })}
          {/* 中心文字 */}
          <text
            x="18"
            y="18"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-text-primary text-[6px] font-bold"
            transform="rotate(90 18 18)"
          >
            {sum}
          </text>
        </svg>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-text-secondary">{item.label}</span>
            <span className="font-medium text-text-primary">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface CalendarDay {
  day: number;
  hasActivity?: boolean;
  isToday?: boolean;
}

export function CalendarSection({ days }: { days: CalendarDay[] }) {
  const t = useTranslations();
  const weekDays = t.raw('calendar.weekDays_short') as string[];

  return (
    <div>
      {/* 星期头 */}
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-text-secondary">
        {weekDays.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      {/* 日期格 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, idx) => (
          <div
            key={idx}
            className={cn(
              'flex h-7 items-center justify-center rounded text-xs',
              d.isToday && 'bg-primary text-white font-bold',
              !d.isToday && d.hasActivity && 'bg-primary/10 text-primary',
              !d.isToday && !d.hasActivity && 'text-text-secondary',
              d.day === 0 && 'invisible',
            )}
          >
            {d.day > 0 ? d.day : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
