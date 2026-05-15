"use client";

import { useMemo, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { useProjectStore, type Task, type Project } from "./store";

// ─── 优先级颜色 ──────────────────────────────────────

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

// ─── 日期工具函数 ────────────────────────────────────

function parseDate(d: string): Date {
  return new Date(d + (d.includes("T") ? "" : "T00:00:00"));
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDateCN(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── 月份显示 ─────────────────────────────────────────

function MonthHeader({
  months,
  dayWidth,
  startDay,
}: {
  months: { label: string; startDay: number; days: number }[];
  dayWidth: number;
  startDay: number;
}) {
  return (
    <div className="flex" style={{ marginLeft: startDay * dayWidth }}>
      {months.map((m, i) => (
        <div
          key={i}
          className="text-xs font-semibold text-text-secondary border-r border-border text-center py-1 bg-muted"
          style={{ width: m.days * dayWidth }}
        >
          {m.label}
        </div>
      ))}
    </div>
  );
}

// ─── 甘特图主体 ───────────────────────────────────────

interface GanttChartProps {
  projectId: string;
}

export default function GanttChart({ projectId }: GanttChartProps) {
  const { getAllTasksByProject, projects } = useProjectStore();
  const [dayWidth, setDayWidth] = useState(36); // 每天像素宽度

  const project = projects.find((p) => p.id === projectId);
  const tasks = getAllTasksByProject(projectId);

  // 计算时间范围
  const { chartStart, chartEnd, totalDays, months, todayOffset } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = addDays(start, 90);
      const total = daysBetween(start, end);
      const monthsArr = buildMonths(start, end);
      const todayOff = daysBetween(start, new Date(new Date().toDateString()));
      return {
        chartStart: start,
        chartEnd: end,
        totalDays: total,
        months: monthsArr,
        todayOffset: todayOff,
      };
    }

    let minDate = new Date("2099-12-31");
    let maxDate = new Date("2000-01-01");

    tasks.forEach((t) => {
      const start = t.startDate ? parseDate(t.startDate) : parseDate(t.dueDate);
      const end = parseDate(t.dueDate);
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    });

    // 扩展范围到月初/月末 + 缓冲
    const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = addDays(
      new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0),
      14
    );

    const total = daysBetween(start, end);
    const monthsArr = buildMonths(start, end);
    const todayOff = daysBetween(start, new Date(new Date().toDateString()));

    return {
      chartStart: start,
      chartEnd: end,
      totalDays: Math.max(total, 60),
      months: monthsArr,
      todayOffset: todayOff >= 0 && todayOff < total ? todayOff : -1,
    };
  }, [tasks]);

  // 构建月份信息
  function buildMonths(
    start: Date,
    end: Date
  ): { label: string; startDay: number; days: number }[] {
    const result: { label: string; startDay: number; days: number }[] = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor < end) {
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const monthEnd = nextMonth < end ? nextMonth : end;
      const days = daysBetween(cursor, monthEnd);
      result.push({
        label: `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`,
        startDay: daysBetween(start, cursor),
        days,
      });
      cursor = nextMonth;
    }
    return result;
  }

  const taskBarHeight = 32;
  const rowHeight = 44;
  const leftPanelWidth = 220;

  return (
    <div className="overflow-auto border rounded-lg bg-bg-card">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
          <Calendar className="size-10 mb-3" />
          <p className="text-sm">暂无任务，请先在项目中创建任务</p>
          <p className="text-xs mt-1">任务将按时间线在此展示</p>
        </div>
      ) : (
        <>
          {/* 顶部时间轴 */}
          <div
            className="flex border-b sticky top-0 bg-bg-card z-10"
            style={{ minWidth: leftPanelWidth + totalDays * dayWidth }}
          >
            {/* 左侧占位 */}
            <div
              className="flex-shrink-0 border-r bg-muted px-3 py-2 text-xs font-semibold text-text-secondary"
              style={{ width: leftPanelWidth }}
            >
              任务名称
            </div>
            {/* 月份+日期 */}
            <div className="flex-1">
              <MonthHeader
                months={months}
                dayWidth={dayWidth}
                startDay={0}
              />
            </div>
          </div>

          {/* 任务行 */}
          <div
            className="relative"
            style={{ minWidth: leftPanelWidth + totalDays * dayWidth }}
          >
            {tasks.map((task, idx) => {
              const taskStart = task.startDate
                ? parseDate(task.startDate)
                : parseDate(task.dueDate);
              const taskEnd = parseDate(task.dueDate);
              const startOffset = daysBetween(chartStart, taskStart);
              const duration = Math.max(
                daysBetween(taskStart, taskEnd) + 1,
                1
              );
              const color = PRIORITY_COLORS[task.priority];

              return (
                <div
                  key={task.id}
                  className={`flex border-b ${
                    idx % 2 === 0 ? "bg-bg-card" : "bg-muted/50"
                  }`}
                  style={{ height: rowHeight }}
                >
                  {/* 左侧名称 */}
                  <div
                    className="flex-shrink-0 border-r px-3 flex items-center gap-2"
                    style={{ width: leftPanelWidth }}
                  >
                    <span className="text-xs text-text-primary truncate flex-1">
                      {task.title}
                    </span>
                    {task.assignee && (
                      <span className="text-[10px] text-text-secondary bg-muted px-1 rounded">
                        {task.assignee}
                      </span>
                    )}
                  </div>

                  {/* 右侧条形图区域 */}
                  <div className="flex-1 relative">
                    {/* 网格线（每7天一条） */}
                    {Array.from({ length: Math.ceil(totalDays / 7) }).map(
                      (_, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 border-r border-border"
                          style={{ left: i * 7 * dayWidth }}
                        />
                      )
                    )}

                    {/* 今天线 */}
                    {todayOffset >= 0 && (
                      <div
                        className="absolute top-0 bottom-0 border-l-2 border-red-400 z-10"
                        style={{ left: todayOffset * dayWidth }}
                      />
                    )}

                    {/* 任务条 */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 rounded-md ${color} opacity-90 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center`}
                      style={{
                        left: startOffset * dayWidth,
                        width: duration * dayWidth - 2,
                        height: taskBarHeight,
                        minWidth: 4,
                      }}
                      title={`${task.title}\n${formatDateCN(taskStart)} - ${formatDateCN(taskEnd)}\n优先级: ${task.priority}`}
                    >
                      {duration * dayWidth > 60 && (
                        <span className="text-[10px] text-white font-medium truncate px-1">
                          {task.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 底部图例 */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="size-3 rounded bg-destructive inline-block" /> 高优先级
          </span>
          <span className="flex items-center gap-1">
            <span className="size-3 rounded bg-warning inline-block" /> 中优先级
          </span>
          <span className="flex items-center gap-1">
            <span className="size-3 rounded bg-success inline-block" /> 低优先级
          </span>
          <span className="flex-1" />
          <span className="flex items-center gap-1">
            <span className="size-3 border-l-2 border-destructive inline-block" /> 今天
          </span>
        </div>
      )}
    </div>
  );
}
