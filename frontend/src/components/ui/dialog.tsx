"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [mounted, setMounted] = React.useState(false)
  const [animating, setAnimating] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setMounted(true)
      // Trigger enter animation next frame
      requestAnimationFrame(() => setAnimating(true))
    } else if (mounted) {
      // Exit animation, then unmount
      setAnimating(false)
      const timer = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open, mounted])

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 transition-opacity duration-200 ease-out",
          animating ? "bg-black/50 backdrop-blur-sm" : "bg-black/0 backdrop-blur-0"
        )}
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            "w-full max-w-lg rounded-card bg-bg-card shadow-xl border border-border",
            "transition-all duration-200 ease-out",
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

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-text-secondary", className)} {...props} />
}

function DialogContent({ className, children, onClose, ...props }: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <>
      <DialogHeader {...props}>
        <div className="flex items-center justify-between">
          {children}
          {onClose && (
            <button
              onClick={onClose}
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

function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-end gap-2 p-6 pt-0", className)} {...props} />
}

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogBody, DialogFooter }
