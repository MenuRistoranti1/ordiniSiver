"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import {
  PackageCheck,
  ChevronDown,
  ClipboardList,
  FileText,
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
  documentUnreadCount?: number
}

type LocaleScelta = {
  restaurant_id: string
  restaurant_name: string
  role?: string | null
}

const links = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Giacenze", href: "/giacenze", icon: Warehouse },
  { label: "Nuovo ordine", href: "/nuovo-ordine", icon: Send },
  { label: "Ricezione merce", href: "/ricezione", icon: PackageCheck },
  { label: "Storico ordini", href: "/storico-ordini", icon: ClipboardList },
  { label: "Storico giacenze", href: "/storico-giacenze", icon: Package },
  { label: "Documenti", href: "/documenti", icon: FileText },
  { label: "Messaggi", href: "/messaggi", icon: MessageCircle },
]

export function LocaleMobileHeader({
  unreadCount = 0,
  documentUnreadCount = 0,
}: Props) {
  const pathname = usePathname()
  const panelRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [selectorAperto, setSelectorAperto] = useState(false)
  const [localeNome, setLocaleNome] = useState("Locale")
  const [localeId, setLocaleId] = useState("")
  const [localiDisponibili, setLocaliDisponibili] = useState<LocaleScelta[]>([])

  const notificheTotali = unreadCount + documentUnreadCount

  useEffect(() => {
    caricaSessione()
  }, [])

  async function caricaSessione() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("Errore lettura sessione locale:", userError)
      return
    }

    if (!user) return

    const { data, error } = await supabase
      .from("local_user_restaurants")
      .select("restaurant_id, restaurant_name, role")
      .eq("user_id", user.id)
      .order("restaurant_name", { ascending: true })

    if (error) {
      console.error("Errore caricamento locali disponibili:", error)
    } else {
      setLocaliDisponibili((data || []) as LocaleScelta[])
    }

    const idSalvato =
      localStorage.getItem("locale_id") ||
      String(user.app_metadata?.locale_id || "")

    const nomeSalvato =
      localStorage.getItem("locale_nome") ||
      String(user.app_metadata?.locale_nome || "")

    setLocaleId(idSalvato)
    setLocaleNome(nomeSalvato || "Locale")
  }

  useEffect(() => {
    if (!open) return

    function chiudiFuori(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSelectorAperto(false)
      }
    }

    function chiudiConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        setSelectorAperto(false)
      }
    }

    document.addEventListener("mousedown", chiudiFuori)
    document.addEventListener("keydown", chiudiConEscape)

    return () => {
      document.removeEventListener("mousedown", chiudiFuori)
      document.removeEventListener("keydown", chiudiConEscape)
    }
  }, [open])

  function cambiaLocale(locale: LocaleScelta) {
    localStorage.setItem("locale_id", String(locale.restaurant_id))
    localStorage.setItem("locale_nome", String(locale.restaurant_name))
    localStorage.setItem("locale_scelto", "true")

    setLocaleId(String(locale.restaurant_id))
    setLocaleNome(String(locale.restaurant_name))
    setSelectorAperto(false)
    setOpen(false)

    window.location.href = "/dashboard"
  }

  function tornaSceltaLocale() {
    localStorage.removeItem("locale_id")
    localStorage.removeItem("locale_nome")
    localStorage.removeItem("restaurant_name")
    localStorage.removeItem("locale_scelto")

    setOpen(false)
    setSelectorAperto(false)
    window.location.href = "/"
  }

  function vai(href: string) {
    setOpen(false)
    setSelectorAperto(false)
    window.location.href = href
  }

  async function esci() {
    await supabase.auth.signOut()

    localStorage.removeItem("locale_id")
    localStorage.removeItem("locale_nome")
    localStorage.removeItem("restaurant_name")
    localStorage.removeItem("locale_scelto")

    window.location.href = "/"
  }

  function badgePerVoce(href: string) {
    if (href === "/messaggi") return unreadCount
    if (href === "/documenti") return documentUnreadCount
    return 0
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
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"
            aria-label="Apri menu locale"
            aria-expanded={open}
          >
            <Grid3X3 className="h-5 w-5" />

            {notificheTotali > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                {notificheTotali}
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
                type="button"
                onClick={() => {
                  setOpen(false)
                  setSelectorAperto(false)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                aria-label="Chiudi menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {localiDisponibili.length > 1 && (
              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-blue-700">
                  Cambia locale rapido
                </p>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectorAperto((value) => !value)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-950 px-3 py-3 text-left text-sm font-black text-white"
                    aria-expanded={selectorAperto}
                  >
                    <span className="truncate">
                      {localeNome || "Seleziona locale"}
                    </span>

                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </button>

                  {selectorAperto && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
                      {localiDisponibili.map((locale) => (
                        <button
                          type="button"
                          key={`mobile-header-${locale.restaurant_id}`}
                          onClick={() => cambiaLocale(locale)}
                          className={`w-full px-4 py-3 text-left text-sm font-black hover:bg-blue-50 ${
                            String(locale.restaurant_id) === String(localeId)
                              ? "bg-blue-600 text-white hover:bg-blue-600"
                              : ""
                          }`}
                        >
                          {locale.restaurant_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {links.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                const badge = badgePerVoce(item.href)

                return (
                  <button
                    type="button"
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

                    {badge > 0 && (
                      <span className="absolute right-2 top-2 min-w-5 rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={tornaSceltaLocale}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white"
            >
              Cambia locale
            </button>

            <button
              type="button"
              onClick={esci}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-black text-white"
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