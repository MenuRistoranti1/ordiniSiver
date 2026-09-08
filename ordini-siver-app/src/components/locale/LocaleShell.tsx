"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  ClipboardList,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  Package,
  PackageCheck,
  Send,
  Warehouse,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"

type LocaleShellProps = {
  children: ReactNode
}

type MenuItem = {
  label: string
  href: string
  icon: typeof Home
  badge?: number
}

export function LocaleShell({ children }: LocaleShellProps) {
  const pathname = usePathname()

  const [localeId, setLocaleId] = useState("")
  const [localeNome, setLocaleNome] = useState("Locale")
  const [messaggiNonLetti, setMessaggiNonLetti] = useState(0)

  useEffect(() => {
    inizializzaShell()
  }, [])

  async function inizializzaShell() {
    const id = localStorage.getItem("locale_id") || ""
    const nome = localStorage.getItem("locale_nome") || "Locale"

    setLocaleId(id)
    setLocaleNome(nome)

    if (id) {
      await caricaMessaggiNonLetti(id)
    }
  }

  async function caricaMessaggiNonLetti(id: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("id")
      .eq("locale_id", id)
      .eq("sender", "admin")
      .eq("is_read", false)

    if (error) {
      console.error("Errore messaggi non letti:", error)
      return
    }

    setMessaggiNonLetti((data || []).length)
  }

  function vai(href: string) {
    window.location.href = href
  }

  async function logout() {
    await supabase.auth.signOut()

    localStorage.removeItem("locale_id")
    localStorage.removeItem("locale_nome")
    localStorage.removeItem("restaurant_name")
    localStorage.removeItem("locale_scelto")
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")

    window.location.href = "/"
  }

  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      label: "Giacenze settimana",
      href: "/giacenze",
      icon: Warehouse,
    },
    {
      label: "Nuovo ordine",
      href: "/nuovo-ordine",
      icon: Send,
    },
    {
      label: "Ricezione merce",
      href: "/ricezione",
      icon: PackageCheck,
    },
    {
      label: "Storico giacenze",
      href: "/storico-giacenze",
      icon: Package,
    },
    {
      label: "Storico ordini",
      href: "/storico-ordini",
      icon: ClipboardList,
    },
    {
      label: "Documenti",
      href: "/documenti",
      icon: FileText,
    },
    {
      label: "Messaggi admin",
      href: "/messaggi",
      icon: MessageCircle,
      badge: messaggiNonLetti,
    },
  ]

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100">
      <div className="flex min-h-screen w-full">
        <aside className="fixed left-0 top-0 hidden h-screen w-72 shrink-0 flex-col bg-slate-950 p-5 text-white lg:flex">
          <div className="mb-4 rounded-3xl bg-slate-900 p-4">
            <h1 className="text-2xl font-black tracking-tight">
              OrdiniSiver
            </h1>

            <p className="mt-1 text-xs font-bold text-slate-300">
              Area Locale
            </p>
          </div>

          <div className="mb-5 rounded-3xl bg-slate-900 p-3">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
              Locale attivo
            </p>

            <div className="truncate rounded-2xl bg-slate-800 px-3 py-3 text-sm font-black text-white">
              {localeNome}
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              const badge = item.badge ?? 0

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => vai(item.href)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-200 hover:translate-x-1 hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </span>

                  {badge > 0 && (
                    <span className="animate-pulse rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <button
            type="button"
            onClick={logout}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-black text-white transition hover:bg-red-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </aside>

        <section className="min-w-0 flex-1 px-3 py-4 sm:px-5 lg:ml-72 lg:px-6 xl:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-4">
            <LocaleMobileHeader unreadCount={messaggiNonLetti} />

            {children}
          </div>
        </section>
      </div>
    </main>
  )
}