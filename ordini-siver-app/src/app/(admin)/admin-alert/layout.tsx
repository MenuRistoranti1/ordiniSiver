import type { ReactNode } from "react"
import AdminRouteGuard from "@/components/AdminRouteGuard"
import AdminAppHeader from "@/components/AdminAppHeader"

export default function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <AdminRouteGuard>
      <AdminAppHeader />
      {children}
    </AdminRouteGuard>
  )
}
