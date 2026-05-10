"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// ============================================================
// Context — 管理当前选中 tab 和切换回调
// ============================================================
interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

// ============================================================
// Tabs — 根容器，提供 context
// ============================================================
interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

// ============================================================
// TabsList — 标签列表容器
//   - role="tablist"
//   - 可选 aria-label
//   - 键盘导航: Arrow keys, Home, End (roving tabindex)
// ============================================================
interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  "aria-label"?: string
}

function TabsList({ className, "aria-label": ariaLabel, onKeyDown, ...props }: TabsListProps) {
  const ctx = React.useContext(TabsContext)

  // 键盘导航：根据 data-value 属性查找所有 tab 按钮
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 先调用外部传入的 onKeyDown（如果有）
    onKeyDown?.(e)
    if (e.defaultPrevented) return

    const list = e.currentTarget
    // 获取所有带 data-value 的按钮（即 TabsTrigger）
    const triggers = list.querySelectorAll<HTMLButtonElement>("[data-value]")
    if (triggers.length === 0) return

    const values = Array.from(triggers)
    const currentIndex = values.findIndex((el) => el === document.activeElement)
    if (currentIndex === -1) return

    let nextIndex: number | undefined

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        // 下一个 tab，循环
        nextIndex = (currentIndex + 1) % values.length
        break
      case "ArrowLeft":
      case "ArrowUp":
        // 上一个 tab，循环
        nextIndex = (currentIndex - 1 + values.length) % values.length
        break
      case "Home":
        // 第一个 tab
        nextIndex = 0
        break
      case "End":
        // 最后一个 tab
        nextIndex = values.length - 1
        break
      default:
        return
    }

    e.preventDefault()
    // 移动焦点并激活对应 tab
    const nextTrigger = values[nextIndex!]
    nextTrigger.focus()
    // 通过 data-value 获取 value 并切换
    const nextValue = nextTrigger.getAttribute("data-value")
    if (nextValue) {
      ctx?.onValueChange(nextValue)
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-text-secondary",
        className,
      )}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

// ============================================================
// TabsTrigger — 单个标签按钮
//   - role="tab"
//   - aria-selected 根据激活状态
//   - aria-controls 指向对应 panel
//   - roving tabindex: 选中为 0，未选中为 -1
// ============================================================
interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx?.value === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      tabIndex={isActive ? 0 : -1}
      data-value={value}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isActive ? "bg-bg-card text-text-primary shadow-sm" : "hover:text-text-primary",
        className,
      )}
      onClick={() => ctx?.onValueChange(value)}
      {...props}
    />
  )
}

// ============================================================
// TabsContent — 标签内容面板
//   - role="tabpanel"
//   - id / aria-labelledby 与对应 trigger 关联
//   - tabIndex={0} 使面板可聚焦
// ============================================================
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ className, value, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext)
  if (ctx?.value !== value) return null
  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={cn("mt-2", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
