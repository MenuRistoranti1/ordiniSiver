import type { ReactNode } from "react"
import LocaleRouteGuard from "@/components/LocaleRouteGuard"

export default function LocaleLayout({
  children,
}: {
  children: ReactNode
}) {
  return <LocaleRouteGuard>{children}</LocaleRouteGuard>
}