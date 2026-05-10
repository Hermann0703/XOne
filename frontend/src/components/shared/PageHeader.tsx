'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

// ─── 类型定义 ──────────────────────────────────────────────

export interface PageHeaderProps {
  /** 页面标题（支持 ReactNode 用于动态问候语） */
  title: ReactNode;
  /** 页面副标题 */
  description?: string;
  /** 右侧自定义内容（日期、操作按钮等） */
  rightContent?: ReactNode;
  /** 是否显示底部边框分隔线 */
  bordered?: boolean;
  /** 额外 CSS 类 */
  className?: string;
}

// ─── 组件 ──────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  rightContent,
  bordered = true,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-1 px-6 pt-6 pb-4 sm:flex-row sm:items-center sm:justify-between',
        bordered && 'border-b border-border',
        className,
      )}
    >
      {/* 左侧：标题 + 描述 */}
      <div className="space-y-0.5 min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>

      {/* 右侧 */}
      {rightContent && (
        <div className="mt-2 shrink-0 sm:mt-0">{rightContent}</div>
      )}
    </header>
  );
}
