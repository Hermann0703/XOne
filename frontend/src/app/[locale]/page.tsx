'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 首页 — 自动重定向到个人仪表盘
 */
export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/personal/dashboard')
  }, [router])

  return null
}
