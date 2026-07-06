"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  Building2,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  Package,
  Ruler,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Truck,
  Users,
  Warehouse,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

const menuGroups = [
  {
    title: "Centro controllo",
    items: [{ href: "/admin-dashboard", label: "Dashboard", icon: Home }],
  },
  {
    title: "Operativo",
    items: [
      { href: "/admin-ordini", label: "Ordini", icon: ShoppingCart },
      { href: "/admin-giacenze", label: "Giacenze", icon: Warehouse },
      {
        href: "/admin-soglie-giacenze",
        label: "Soglie giacenze",
        icon: SlidersHorizontal,
      },
      { href: "/admin-consegne", label: "Consegne", icon: Truck },
      {
        href: "/admin-storico-ordini",
        label: "Storico ordini",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "Anagrafiche",
    items: [
      { href: "/admin-locali", label: "Locali", icon: Building2 },
      { href: "/admin-prodotti", label: "Prodotti", icon: Package },
      { href: "/admin-categories", label: "Categorie", icon: Tags },
      { href: "/admin-units", label: "Unità", icon: Ruler },
      { href: "/admin-utenti", label: "Utenti", icon: Users },
    ],
  },
  {
    title: "Economia",
    items: [
      { href: "/admin-import-prezzi", label: "Import prezzi", icon: FileText },
      {
        href: "/admin-storico-fatture",
        label: "Storico fatture",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin-messaggi", label: "Messaggi", icon: MessageCircle },
      { href: "/admin-alert", label: "Alert", icon: Bell },
    ],
  },
]

export default function AdminV2Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    router.replace("/admin")
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[340px] flex-col border-r border-slate-800 bg-slate-950 text-white lg:flex">
        <div className="border-b border-slate-800 px-7 py-7">
          <div className="flex items-center gap-4">
            <img
              src="/ordini-siver-logo.png"
              alt="Ordini Siver"
              className="h-16 w-16 rounded-2xl object-cover shadow-xl shadow-blue-950/40"
            />

            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Ordini Siver
            </h1>
          </div>
        </div>

        <nav className="flex-1 space-y-8 overflow-y-auto px-5 py-6">
          {menuGroups.map((group) => (
            <section key={group.title}>
              <p className="mb-3 px-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {group.title}
              </p>

              <div className="space-y-2">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-base font-bold transition ${
                        active
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                          : "text-slate-300 hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-5">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-700"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[340px]">{children}</main>
    </div>
  )
}