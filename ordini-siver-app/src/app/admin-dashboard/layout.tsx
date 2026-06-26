import type { ReactNode } from "react"
import AdminRouteGuard from "@/components/AdminRouteGuard"
import AdminShell from "@/components/AdminShell"

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <AdminRouteGuard>
      <AdminShell>{children}</AdminShell>
    </AdminRouteGuard>
  )
}