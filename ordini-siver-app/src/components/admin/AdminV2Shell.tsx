"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  PackageCheck,
  Ruler,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
  X,
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
      { href: "/admin-dispersioni", label: "Dispersioni", icon: Boxes },
      {
        href: "/admin-soglie-giacenze",
        label: "Soglie giacenze",
        icon: SlidersHorizontal,
      },
      { href: "/admin-consegne", label: "Consegne", icon: Truck },
      { href: "/admin-documenti", label: "Carica documenti", icon: FileText },
      { href: "/admin-ricezioni", label: "Ricezioni", icon: PackageCheck },
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
      { href: "/admin-prezzi", label: "Andamento prezzi", icon: TrendingUp },
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [messaggiNonLetti, setMessaggiNonLetti] = useState(0)
  const [alertNonLetti, setAlertNonLetti] = useState(0)

  /*
    Messaggi e alert non letti vanno mostrati nel menu: senza un segno visibile
    ci si accorge di una segnalazione solo entrando nella pagina. Il conteggio
    si aggiorna da solo ogni minuto, cosi' resta valido anche restando fermi
    sulla stessa schermata.
  */
  useEffect(() => {
    let attivo = true

    async function caricaConteggi() {
      const [messaggi, alert] = await Promise.all([
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false)
          .neq("sender", "admin"),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("read", false)
          .is("locale_id", null),
      ])

      if (!attivo) return

      setMessaggiNonLetti(messaggi.count || 0)
      setAlertNonLetti(alert.count || 0)
    }

    void caricaConteggi()
    const timer = window.setInterval(caricaConteggi, 60000)

    return () => {
      attivo = false
      window.clearInterval(timer)
    }
  }, [pathname])

  function badgePerVoce(href: string) {
    if (href === "/admin-messaggi") return messaggiNonLetti
    if (href === "/admin-alert") return alertNonLetti
    return 0
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    router.replace("/admin")
  }

  function MenuContent({ mobile = false }: { mobile?: boolean }) {
    return (
      <>
        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {menuGroups.map((group) => (
            <section key={group.title}>
              <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {group.title}
              </p>

              <div className="space-y-2">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const badge = badgePerVoce(item.href)
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => mobile && setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        active
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                          : "text-slate-300 hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="flex-1">{item.label}</span>

                      {badge > 0 && (
                        <span
                          className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-black ${
                            active ? "bg-white text-blue-700" : "bg-red-600 text-white"
                          }`}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-700"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/ordini-siver-logo.png"
              alt="Ordini Siver"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <div>
              <p className="text-base font-black text-slate-950">
                Ordini Siver
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                Area Admin
              </p>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"
            aria-label="Apri menu admin"
          >
            <Menu className="h-5 w-5" />

            {messaggiNonLetti + alertNonLetti > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                {messaggiNonLetti + alertNonLetti > 99
                  ? "99+"
                  : messaggiNonLetti + alertNonLetti}
              </span>
            )}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/50 lg:hidden">
          <div className="ml-auto flex h-full w-[88%] max-w-sm flex-col bg-slate-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
              <div className="flex items-center gap-3">
                <img
                  src="/ordini-siver-logo.png"
                  alt="Ordini Siver"
                  className="h-12 w-12 rounded-2xl object-cover"
                />
                <div>
                  <p className="text-lg font-black">Ordini Siver</p>
                  <p className="text-xs font-bold text-slate-400">
                    Menu Admin
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white"
                aria-label="Chiudi menu admin"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <MenuContent mobile />
          </div>
        </div>
      )}

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

        <MenuContent />
      </aside>

      <main className="min-h-screen lg:pl-[340px]">{children}</main>
    </div>
  )
}