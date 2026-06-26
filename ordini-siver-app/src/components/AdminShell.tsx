"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const vociMenu = [
  { href: "/admin-dashboard", label: "Dashboard" },
    { href: "/admin-utenti", label: "Utenti locali" },
  { href: "/admin-ordini", label: "Ordini" },
  { href: "/admin-giacenze", label: "Giacenze" },
  { href: "/admin-consegne", label: "Consegne" },
  { href: "/admin-prodotti", label: "Prodotti" },
  { href: "/admin-soglie-giacenze", label: "Soglie giacenze" },
  { href: "/admin-import-prezzi", label: "Import prezzi" },
  { href: "/admin-storico-fatture", label: "Storico fatture" },
  { href: "/admin-cancellazioni", label: "Cancellazioni" },
  { href: "/admin-messaggi", label: "Messaggi" },
  { href: "/admin-alert", label: "Alert" },
  { href: "/admin-estrazioni", label: "Estrazioni" },
]

export default function AdminShell({
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
      <aside className="fixed left-0 top-0 h-screen w-72 bg-slate-950 text-white hidden lg:flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="text-2xl font-bold">Siver Admin</div>
          <div className="text-sm text-slate-400 mt-1">Centro controllo</div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {vociMenu.map((voce) => {
            const attivo = pathname === voce.href

            return (
              <Link
                key={voce.href}
                href={voce.href}
                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  attivo
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {voce.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20"
          >
            Esci
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <div className="lg:hidden bg-slate-950 text-white p-4">
          <div className="font-bold text-lg">Siver Admin</div>
        </div>

        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}