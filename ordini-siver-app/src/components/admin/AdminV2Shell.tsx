"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

const menuItems = [
  { href: "/admin-dashboard", label: "Dashboard", icon: Home },
  { href: "/admin-utenti", label: "Utenti", icon: Users },
  { href: "/admin-prodotti", label: "Prodotti", icon: Package },
  { href: "/admin-ordini", label: "Ordini", icon: ShoppingCart },
  { href: "/admin-giacenze", label: "Giacenze", icon: Warehouse },
  { href: "/admin-consegne", label: "Consegne", icon: Truck },
  { href: "/admin-import-prezzi", label: "Import prezzi", icon: FileText },
  { href: "/admin-storico-fatture", label: "Storico fatture", icon: ClipboardList },
  { href: "/admin-messaggi", label: "Messaggi", icon: MessageCircle },
  { href: "/admin-alert", label: "Alert", icon: Bell },
]

export default function AdminV2Shell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    await supabase.auth.signOut()
    router.replace("/admin")
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col bg-slate-950 text-white lg:flex">
        <div className="border-b border-white/10 p-6">
          <div className="text-2xl font-black tracking-tight">Siver Admin</div>
          <div className="mt-1 text-sm font-semibold text-slate-400">
            Gestionale V2
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white hover:bg-red-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur lg:hidden">
          <div className="font-black text-slate-950">Siver Admin</div>
          <div className="text-xs font-bold text-slate-500">Gestionale V2</div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}