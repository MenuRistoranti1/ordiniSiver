"use client"

import type { ReactNode } from "react"
import { useLocale } from "@/hooks/useLocale"

export default function LocaleRouteGuard({
  children,
}: {
  children: ReactNode
}) {
  const { loading, ok } = useLocale()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="rounded-2xl bg-white px-6 py-5 text-sm font-bold text-slate-700 shadow-sm">
          Verifica accesso locale...
        </div>
      </main>
    )
  }

  if (!ok) {
    return null
  }

  return <>{children}</>
}