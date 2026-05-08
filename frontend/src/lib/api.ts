// Axios 实例 — 认证专用（自动附加 Bearer token, 401 时清理）
// 注意：普通 CRUD 请使用 @/lib/api/client 中的 apiGet/apiPost/apiPatch/apiDelete

import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器 — 从 localStorage 取出 token 附加到 Authorization 头
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('xone-token');
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
        localStorage.removeItem('xone-token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
