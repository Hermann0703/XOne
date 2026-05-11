// 当前模式状态管理
// 管理 personal / work 模式切换
//
// SSR 安全：初始值始终为 'personal'（与服务器端一致），
// 客户端 hydrate 后在 useEffect 中从 localStorage 同步真实值。

import { create } from 'zustand';

export type CurrentMode = 'personal' | 'work';

interface ModeState {
  /** 当前激活的模式 */
  mode: CurrentMode;
  /** 是否已完成客户端 hydration */
  hydrated: boolean;
  /** 切换模式 */
  setMode: (mode: CurrentMode) => void;
  /** 切换到另一模式 */
  toggleMode: () => void;
  /** 从 localStorage 同步模式（仅客户端 mount 后调用） */
  hydrate: () => void;
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: 'personal',
  hydrated: false,
  setMode: (mode) => {
    localStorage.setItem('xone-mode', mode);
    set({ mode, hydrated: true });
  },
  toggleMode: () => {
    const current = get().mode;
    const next = current === 'personal' ? 'work' : 'personal';
    localStorage.setItem('xone-mode', next);
    set({ mode: next, hydrated: true });
  },
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const saved = localStorage.getItem('xone-mode');
      if (saved === 'personal' || saved === 'work') {
        set({ mode: saved, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
