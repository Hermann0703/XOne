// 标签页状态管理
// 管理顶部标签栏的打开、关闭、切换

import { create } from 'zustand'

export interface Tab {
  /** 唯一标识，如 "personal.dashboard" */
  id: string
  /** i18n key，如 "nav.dashboard" */
  labelKey: string
  /** 路由路径 */
  path: string
  /** 所属模式 */
  mode: 'personal' | 'work'
}

interface TabState {
  /** 当前打开的标签页列表 */
  tabs: Tab[]
  /** 当前激活的标签页 id */
  activeTabId: string | null
  /** 打开标签页：已存在则激活，否则追加并激活 */
  openTab: (tab: Tab) => void
  /** 关闭标签页：移除并激活相邻标签 */
  closeTab: (id: string) => void
  /** 设置激活标签 */
  setActiveTab: (id: string) => void
}

/** 默认首页标签 */
const WELCOME_TAB: Tab = {
  id: 'welcome',
  labelKey: 'app.name',
  path: '/',
  mode: 'personal',
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [WELCOME_TAB],
  activeTabId: WELCOME_TAB.id,

  openTab: (tab) => {
    const { tabs } = get()
    const existing = tabs.find((t) => t.id === tab.id)
    if (existing) {
      set({ activeTabId: tab.id })
    } else {
      set({ tabs: [...tabs, tab], activeTabId: tab.id })
    }
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get()
    // 保留至少一个 tab
    if (tabs.length <= 1) return

    const idx = tabs.findIndex((t) => t.id === id)
    if (idx === -1) return

    const nextTabs = tabs.filter((t) => t.id !== id)

    let nextActiveId = activeTabId
    if (activeTabId === id) {
      // 优先激活右侧，否则左侧
      if (idx < nextTabs.length) {
        nextActiveId = nextTabs[idx].id
      } else {
        nextActiveId = nextTabs[idx - 1].id
      }
    }

    set({ tabs: nextTabs, activeTabId: nextActiveId })
  },

  setActiveTab: (id) => {
    set({ activeTabId: id })
  },
}))
