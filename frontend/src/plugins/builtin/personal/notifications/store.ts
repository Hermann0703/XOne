// 通知中心 Zustand Store
// 管理通知列表、未读数、已读标记

import { create } from 'zustand';
import { axiosClient } from '@/lib/api/client';

// ─── 类型定义 ───────────────────────────────────────

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string; // 'info' | 'success' | 'warning' | 'error'
  link?: string;
  is_read: boolean;
  created_at: string;
}

// ─── Store 接口 ─────────────────────────────────────

interface NotificationStore {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
  loading: boolean;

  fetchNotifications: (limit?: number, offset?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<void>;
}

// ─── API 请求 headers ───────────────────────────────

const headers = { 'X-User-ID': 'default' };

// ─── Store 实现 ─────────────────────────────────────

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  loading: false,

  fetchNotifications: async (limit = 50, offset = 0) => {
    set({ loading: true });
    try {
      const res = await axiosClient.get('/personal/notifications', {
        params: { limit, offset },
        headers,
      }) as unknown as { notifications: NotificationItem[]; total: number };
      set({
        notifications: res.notifications || [],
        total: res.total || 0,
      });
    } catch {
      // 静默处理
    } finally {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await axiosClient.get('/personal/notifications/unread-count', {
        headers,
      }) as unknown as { unread_count: number };
      set({ unreadCount: res.unread_count || 0 });
    } catch {
      // 静默处理
    }
  },

  markAsRead: async (id: string) => {
    try {
      await axiosClient.put(`/personal/notifications/${id}/read`, null, { headers });
      const { notifications } = get();
      set({
        notifications: notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
      return true;
    } catch {
      return false;
    }
  },

  markAllAsRead: async () => {
    const { notifications } = get();
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      // 逐个标记已读
      await Promise.all(unreadIds.map((id) =>
        axiosClient.put(`/personal/notifications/${id}/read`, null, { headers })
      ));
      set({
        notifications: notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      });
    } catch {
      // 静默处理，部分失败也更新 UI
      set({
        unreadCount: 0,
      });
    }
  },
}));
