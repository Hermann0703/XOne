// 认证 Zustand Store — 登录/注册/登出/获取当前用户

import { create } from 'zustand';
import { apiPost, apiGet } from '@/lib/api/client';
import { setToken, getToken, removeToken } from '@/lib/tokenStore';

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
    // NOTE: axios 响应拦截器提取了 response.data，登录 API 返回扁平 {user, access_token}（非 {code,message,data} 包裹）
    const res = (await apiPost('/auth/login', { username, password })) as unknown as {
      user: UserInfo;
      access_token: string;
    };
    const { user, access_token } = res;
    setToken(access_token);
    set({ user, token: access_token, isAuthenticated: true });
  },

  // ── 注册 ──
  register: async (
    username: string,
    email: string,
    password: string,
    display_name?: string
  ) => {
    const res = (await apiPost('/auth/register', {
      username,
      email,
      password,
      display_name: display_name || username,
    })) as unknown as { user: UserInfo; access_token: string };
    const { user, access_token } = res;
    setToken(access_token);
    set({ user, token: access_token, isAuthenticated: true });
  },

  // ── 登出 ──
  logout: () => {
    removeToken();
    set({ user: null, token: null, isAuthenticated: false });
  },

  // ── 获取当前用户 ──
  fetchMe: async () => {
    try {
      const res = await apiGet<UserInfo>('/auth/me');
      set({ user: res.data, isAuthenticated: true });
    } catch {
      // token 无效或过期 → 登出
      get().logout();
    }
  },

  // ── 初始化 ──
  init: async () => {
    const token = getToken();
    if (token) {
      set({ token });
      await get().fetchMe();
    }
  },
}));
