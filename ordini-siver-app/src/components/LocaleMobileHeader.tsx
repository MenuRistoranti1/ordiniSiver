"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import {
  ClipboardList,
  Grid3X3,
  Home,
  LogOut,
  MessageCircle,
  Package,
  Send,
  Warehouse,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Props = {
  unreadCount?: number
}

const links = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Giacenze", href: "/giacenze", icon: Warehouse },
  { label: "Nuovo ordine", href: "/nuovo-ordine", icon: Send },
  { label: "Storico ordini", href: "/storico-ordini", icon: ClipboardList },
  { label: "Storico giacenze", href: "/storico-giacenze", icon: Package },
  { label: "Messaggi", href: "/messaggi", icon: MessageCircle },
]

export function LocaleMobileHeader({ unreadCount = 0 }: Props) {
  const pathname = usePathname()
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [localeNome, setLocaleNome] = useState("Locale")

  useEffect(() => {
    caricaSessione()
  }, [])

  async function caricaSessione() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const nome = String(user?.app_metadata?.locale_nome || "Locale")
    setLocaleNome(nome)
  }

  useEffect(() => {
    if (!open) return

    function chiudiFuori(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", chiudiFuori)
    return () => document.removeEventListener("mousedown", chiudiFuori)
  }, [open])

  function vai(href: string) {
    setOpen(false)
    window.location.href = href
  }

  async function esci() {
    await supabase.auth.signOut()
    localStorage.removeItem("locale_id")
    localStorage.removeItem("locale_nome")
    localStorage.removeItem("restaurant_name")
    window.location.href = "/"
  }

  return (
    <>
      <header className="sticky top-0 z-40 mb-4 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-black tracking-tight text-slate-950">
              OrdiniSiver
            </p>
            <p className="truncate text-[11px] font-bold text-slate-500">
              {localeNome}
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"
            aria-label="Apri menu locale"
          >
            <Grid3X3 className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 p-3 lg:hidden">
          <div
            ref={panelRef}
            className="ml-auto mt-1 w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Menu locale
                </h2>
                <p className="max-w-56 truncate text-xs font-bold text-slate-500">
                  {localeNome}
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                aria-label="Chiudi menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {links.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                const badge = item.href === "/messaggi" && unreadCount > 0

                return (
                  <button
                    key={item.href}
                    onClick={() => vai(item.href)}
                    className={`relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-slate-50 text-slate-800"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-[11px] font-black leading-tight">
                      {item.label}
                    </span>

                    {badge && (
                      <span className="absolute right-2 top-2 min-w-5 rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              onClick={esci}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-black text-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  )
}