// 当前模式状态管理
// 管理 personal / work 模式切换

import { create } from 'zustand';

export type CurrentMode = 'personal' | 'work';

interface ModeState {
  /** 当前激活的模式 */
  mode: CurrentMode;
  /** 切换模式 */
  setMode: (mode: CurrentMode) => void;
  /** 切换到另一模式 */
  toggleMode: () => void;
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: typeof window !== 'undefined'
    ? (localStorage.getItem('xone-mode') as CurrentMode) || 'personal'
    : 'personal',
  setMode: (mode) => {
    localStorage.setItem('xone-mode', mode);
    set({ mode });
  },
  toggleMode: () => {
    const current = get().mode;
    const next = current === 'personal' ? 'work' : 'personal';
    localStorage.setItem('xone-mode', next);
    set({ mode: next });
  },
}));
