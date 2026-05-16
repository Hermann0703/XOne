// 内存级 Token 存储 — 替代 localStorage
// 在浏览器沙箱阻止全部 Web Storage（localStorage/sessionStorage/cookie）时，
// 使用模块级变量存储 token，在 SPA 会话期间保持有效。

let _token: string | null = null;

/** 获取当前 token */
export function getToken(): string | null {
  return _token;
}

/** 设置 token */
export function setToken(token: string): void {
  _token = token;
}

/** 清除 token */
export function removeToken(): void {
  _token = null;
}

/** 检查是否有 token */
export function hasToken(): boolean {
  return _token !== null && _token.length > 0;
}
