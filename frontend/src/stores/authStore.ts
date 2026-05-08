// 认证 Zustand Store — 登录/注册/登出/获取当前用户

import { create } from 'zustand';
import api from '@/lib/api';

// ─── 类型定义 ─────────────────────────────────────

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
}

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    display_name?: string
  ) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  init: () => Promise<void>;
}

// ─── Store 实现 ───────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  // ── 登录 ──
  login: async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { user, access_token } = res.data;
    localStorage.setItem('xone-token', access_token);
    set({ user, token: access_token, isAuthenticated: true });
  },

  // ── 注册 ──
  register: async (
    username: string,
    email: string,
    password: string,
    display_name?: string
  ) => {
    const res = await api.post('/auth/register', {
      username,
      email,
      password,
      display_name: display_name || username,
    });
    const { user, access_token } = res.data;
    localStorage.setItem('xone-token', access_token);
    set({ user, token: access_token, isAuthenticated: true });
  },

  // ── 登出 ──
  logout: () => {
    localStorage.removeItem('xone-token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  // ── 获取当前用户 ──
  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data, isAuthenticated: true });
    } catch {
      // token 无效或过期 → 登出
      get().logout();
    }
  },

  // ── 初始化 ──
  init: async () => {
    const token = localStorage.getItem('xone-token');
    if (token) {
      set({ token });
      await get().fetchMe();
    }
  },
}));
