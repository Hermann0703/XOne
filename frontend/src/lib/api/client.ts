// API 客户端 — 基于 axios 的统一请求封装
// 响应格式: {code, message, data, paging:{total,total_pages,page,page_size}}

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

const BASE_URL = typeof window !== 'undefined'
  ? '/api/v1'
  : 'http://localhost:8000/api/v1';

export const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器 — 附加 token
axiosClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('xone-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 响应拦截器 — 统一错误处理，401 自动跳转登录
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || '请求失败';
    console.error('[API Error]', message);

    // 401 未认证 → 清除 token 并跳转登录
    if (status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('xone-token');
      // 避免重复跳转
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

/** 通用 GET 请求 */
export async function apiGet<T = unknown>(url: string, params?: Record<string, unknown>): Promise<{ code: number; message: string; data: T; paging?: { total: number; total_pages: number; page: number; page_size: number } }> {
  return axiosClient.get(url, { params }) as unknown as Promise<{ code: number; message: string; data: T; paging?: { total: number; total_pages: number; page: number; page_size: number } }>;
}

/** 通用 POST 请求 */
export async function apiPost<T = unknown>(url: string, data?: unknown): Promise<{ code: number; message: string; data: T }> {
  return axiosClient.post(url, data) as unknown as Promise<{ code: number; message: string; data: T }>;
}

/** 通用 PATCH 请求 */
export async function apiPatch<T = unknown>(url: string, data?: unknown): Promise<{ code: number; message: string; data: T }> {
  return axiosClient.patch(url, data) as unknown as Promise<{ code: number; message: string; data: T }>;
}

/** 通用 PUT 请求 */
export async function apiPut<T = unknown>(url: string, data?: unknown): Promise<{ code: number; message: string; data: T }> {
  return axiosClient.put(url, data) as unknown as Promise<{ code: number; message: string; data: T }>;
}

/** 通用 DELETE 请求 */
export async function apiDelete<T = unknown>(url: string): Promise<{ code: number; message: string; data: T }> {
  return axiosClient.delete(url) as unknown as Promise<{ code: number; message: string; data: T }>;
}

export default axiosClient;
