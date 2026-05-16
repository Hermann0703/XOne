// Axios 实例 — 认证专用（自动附加 Bearer token, 401 时清理）
// 注意：普通 CRUD 请使用 @/lib/api/client 中的 apiGet/apiPost/apiPatch/apiDelete

import axios from 'axios';
import { getToken, removeToken } from './tokenStore';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器 — 从内存 tokenStore 取出 token 附加到 Authorization 头
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 响应拦截器 — 401 时清除本地 token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        removeToken();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
