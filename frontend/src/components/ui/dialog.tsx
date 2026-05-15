"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

// ─── 可聚焦元素选择器 ──────────────────────────────────
// 用于焦点陷阱：查询弹窗内所有可参与 Tab 导航的元素
const FOCUSABLE_SELECTOR =
  'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

// ─── Dialog Props ──────────────────────────────────────
interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /** aria-labelledby 指向标题元素的 id（对应 DialogTitle 的 id） */
  titleId?: string
  /** aria-describedby 指向描述元素的 id（对应 DialogDescription 的 id） */
  descriptionId?: string
}

// ─── Dialog 主组件 ─────────────────────────────────────
function Dialog({ open, onOpenChange, children, titleId, descriptionId }: DialogProps) {
  const [mounted, setMounted] = React.useState(false)
  const [animating, setAnimating] = React.useState(false)

  // 弹窗内容面板的引用 —— 用于自动聚焦与焦点陷阱查询
  const contentRef = React.useRef<HTMLDivElement>(null)
  // 保存打开弹窗前聚焦的元素，关闭后恢复
  const previousActiveElementRef = React.useRef<Element | null>(null)

  // ── 打开 / 关闭动画 & 挂载管理 ──
  React.useEffect(() => {
    if (open) {
      // 打开前保存当前聚焦元素，供关闭后恢复使用
      previousActiveElementRef.current = document.activeElement
      setMounted(true)
      // 下一帧触发入场动画
      requestAnimationFrame(() => setAnimating(true))
    } else if (mounted) {
      // 退出动画，动画结束后卸载 DOM
      setAnimating(false)
      // 关闭后恢复之前聚焦的元素（无论通过何种方式关闭）
      const prev = previousActiveElementRef.current
      if (prev instanceof HTMLElement) {
        setTimeout(() => prev.focus(), 0)
      }
      const timer = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open, mounted])

  // ── 禁止 body 背景滚动 ──
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  // ── 自动聚焦：弹窗挂载且动画入场后，优先聚焦第一个可聚焦元素 ──
  React.useEffect(() => {
    if (!mounted || !animating || !contentRef.current) return

    const timer = setTimeout(() => {
      const firstFocusable = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      if (firstFocusable) {
        firstFocusable.focus()
      } else {
        // 没有可聚焦元素时聚焦面板本身
        contentRef.current?.focus()
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [mounted, animating])

  // ── 关闭回调（遮罩点击时使用） ──
  const handleClose = React.useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // ── ESC 键关闭 ──
  React.useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        handleClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, handleClose])

  // ── 焦点陷阱：Tab / Shift+Tab 在弹窗内循环 ──
  React.useEffect(() => {
    if (!open || !contentRef.current) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      const focusableElements = contentRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (!focusableElements || focusableElements.length === 0) return

      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift+Tab：从第一个元素跳回最后一个
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable.focus()
        }
      } else {
        // Tab：从最后一个元素跳回第一个
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])

  if (!mounted) return null

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      {/* 遮罩层 —— 点击可关闭 */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="关闭弹窗"
        className={cn(
          "fixed inset-0 transition-opacity duration-200 ease-out",
          animating ? "bg-black/50 backdrop-blur-sm" : "bg-black/0 backdrop-blur-0"
        )}
        onClick={handleClose}
      />
      {/* 弹窗内容面板 */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={contentRef}
          tabIndex={-1}
          className={cn(
            "w-full max-w-lg rounded-card bg-bg-card shadow-4 border border-border",
            "transition-[transform,opacity] duration-200 ease-out",
            animating
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── DialogHeader ──────────────────────────────────────
function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)} {...props} />
}

// ─── DialogTitle ───────────────────────────────────────
function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
}

// ─── DialogDescription ─────────────────────────────────
function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-text-secondary", className)} {...props} />
}

// ─── DialogContent ─────────────────────────────────────
function DialogContent({ className, children, onClose, ...props }: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <>
      <DialogHeader {...props}>
        <div className="flex items-center justify-between">
          {children}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="关闭"
              className="rounded-sm opacity-70 hover:opacity-100 active:scale-90 transition-all duration-150"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </DialogHeader>
    </>
  )
}

// ─── DialogBody ────────────────────────────────────────
function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />
}

// ─── DialogFooter ──────────────────────────────────────
function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-end gap-2 p-6 pt-0", className)} {...props} />
}

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogBody, DialogFooter }
