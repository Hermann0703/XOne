'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Bell, CheckCircle2, AlertTriangle, XCircle, Check } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  useNotificationStore,
  type NotificationItem,
} from '@/plugins/builtin/personal/notifications/store';

// ─── 类型图标映射 ───────────────────────────────────

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Bell,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColors: Record<string, string> = {
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-green-500 dark:text-green-400',
  warning: 'text-amber-500 dark:text-amber-400',
  error: 'text-red-500 dark:text-red-400',
};

// ─── 相对时间格式化 ─────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  if (days < 365) return `${Math.floor(days / 30)}个月前`;
  return `${Math.floor(days / 365)}年前`;
}

// ─── 通知卡片 ───────────────────────────────────────

function NotificationCard({
  item,
  onMarkRead,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const router = useRouter();
  const Icon = typeIcons[item.type] || Bell;
  const color = typeColors[item.type] || typeColors.info;

  const handleClick = () => {
    if (!item.is_read) {
      onMarkRead(item.id);
    }
    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors',
        'bg-card hover:bg-muted/50 border border-border/50',
        'dark:bg-card dark:hover:bg-muted/30 dark:border-border/30',
        !item.is_read && 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30'
      )}
    >
      {/* 类型图标 */}
      <div className={cn('shrink-0 mt-0.5', color)}>
        <Icon className="size-5" />
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground truncate">
            {item.title}
          </h4>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(item.created_at)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
          {item.message}
        </p>
      </div>

      {/* 未读圆点 */}
      {!item.is_read && (
        <div className="shrink-0 mt-2">
          <div className="size-2 rounded-full bg-blue-500 dark:bg-blue-400" />
        </div>
      )}

      {/* 已读标记 */}
      {!item.is_read && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(item.id);
          }}
          className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="标记已读"
        >
          <Check className="size-4 text-muted-foreground hover:text-green-500" />
        </button>
      )}
    </div>
  );
}

// ─── 骨架屏 ─────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-border/50">
          <Skeleton className="size-5 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 空状态 ─────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Bell className="size-16 mb-4 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── 主组件 ─────────────────────────────────────────

export default function NotificationList() {
  const t = useTranslations();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();
  const [tab, setTab] = useState('all');

  // 初始加载
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // 过滤列表
  const filtered = useMemo(() => {
    if (tab === 'unread') {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, tab]);

  const unreadItems = useMemo(
    () => notifications.filter((n) => !n.is_read),
    [notifications]
  );

  const description = unreadCount > 0
    ? `${unreadCount} 条未读通知`
    : '全部已读';

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('notifications.title')}
        description={description}
        rightContent={
          unreadItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              <Check className="size-4 mr-1.5" />
              {t('notifications.markAllRead')}
            </Button>
          )
        }
      />

      <div className="px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">
              {t('notifications.all')}
            </TabsTrigger>
            <TabsTrigger value="unread">
              {t('notifications.unread')}
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-6 pb-6">
        {loading ? (
          <NotificationSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState message={t('notifications.empty')} />
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                onMarkRead={markAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
