import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  isCollapsed: boolean
  toggle: () => void
  expand: () => void
  collapse: () => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,

      toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),

      expand: () => set({ isCollapsed: false }),

      collapse: () => set({ isCollapsed: true }),
    }),
    {
      name: 'xone-sidebar-state',
    }
  )
)
