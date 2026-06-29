import type { ReactNode } from "react"
import AdminRouteGuard from "@/components/AdminRouteGuard"
import AdminV2Shell from "@/components/admin/AdminV2Shell"

export default function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <AdminRouteGuard>
      <AdminV2Shell>{children}</AdminV2Shell>
    </AdminRouteGuard>
  )
}