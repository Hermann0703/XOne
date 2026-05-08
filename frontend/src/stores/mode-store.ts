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
  mode: 'personal',
  setMode: (mode) => set({ mode }),
  toggleMode: () => {
    const current = get().mode;
    set({ mode: current === 'personal' ? 'work' : 'personal' });
  },
}));
