'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl'
import { Sidebar } from '@/components/layout/Sidebar'
import { TabBar } from '@/components/layout/TabBar'
import { MainContent } from '@/components/layout/MainContent'
import { useModeStore } from '@/stores/mode-store'
import { getSidebarGroups } from '@/components/layout/sidebar-config'

/** 移动端断点：≤768px（Tailwind md breakpoint） */
const MOBILE_BREAKPOINT = 768

/**
 * AppShell — 客户端应用壳
 * 集成侧边栏 + 顶部标签栏 + 主内容区
 * 移动端适配：overlay 侧边栏 + 响应式布局
 */
export function AppShell({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode
  locale: string
  messages: AbstractIntlMessages
}) {
  const mode = useModeStore((s) => s.mode)
  const setMode = useModeStore((s) => s.setMode)
  const pathname = usePathname()

  // 从 URL 路径推导当前模式，确保 SSR 与客户端首次渲染一致
  const isWorkPath = pathname.includes('/work/')
  const isPersonalPath = pathname.includes('/personal/')
  const effectiveMode: 'personal' | 'work' =
    isWorkPath ? 'work' : isPersonalPath ? 'personal' : mode

  const groups = getSidebarGroups(effectiveMode)

  // 移动端检测
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    setIsMobile(mq.matches)

    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      // 切换回桌面端时关闭移动端 overlay
      if (!e.matches) setMobileSidebarOpen(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // 路由变化时关闭移动端侧边栏
  useEffect(() => {
    if (isMobile) setMobileSidebarOpen(false)
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // 移动端 hamburger 点击
  const handleMenuClick = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev)
  }, [])

  // 移动端关闭 sidebar overlay
  const handleMobileClose = useCallback(() => {
    setMobileSidebarOpen(false)
  }, [])

  // Reverse-sync: update mode store from URL on first load / direct navigation
  useEffect(() => {
    const isWork = pathname.startsWith('/zh/work') || pathname.startsWith('/en/work')
    const isPersonal = pathname.startsWith('/zh/personal') || pathname.startsWith('/en/personal')
    if (isWork && mode !== 'work') setMode('work')
    else if (isPersonal && mode !== 'personal') setMode('personal')
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Shanghai">
      <div>
        <Sidebar
          groups={groups}
          locale={locale}
          isMobile={isMobile}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={handleMobileClose}
        />
        <TabBar
          isMobile={isMobile}
          onMenuClick={handleMenuClick}
        />
        <MainContent isMobile={isMobile}>{children}</MainContent>
      </div>
    </NextIntlClientProvider>
  )
}
