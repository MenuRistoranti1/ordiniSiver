"use client"

import { useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"

type StatoAccesso = "verifica" | "autorizzato" | "negato"

export default function AdminRouteGuard({ children }: { children: ReactNode }) {
  const [stato, setStato] = useState<StatoAccesso>("verifica")

  useEffect(() => {
    let attivo = true

    async function verificaAccesso() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      const adminAutorizzato =
        !error && user?.app_metadata?.role === "admin"

      if (!attivo) return

      if (!adminAutorizzato) {
        localStorage.removeItem("admin")
        localStorage.removeItem("admin_mode")
        setStato("negato")
        window.location.replace("/admin")
        return
      }

      // Compatibilità temporanea con le pagine esistenti.
      // La sicurezza reale deriva dalla sessione Supabase verificata sopra.
      localStorage.setItem("admin", "true")
      setStato("autorizzato")
    }

    verificaAccesso()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!attivo) return

      if (event === "SIGNED_OUT") {
        localStorage.removeItem("admin")
        localStorage.removeItem("admin_mode")
        window.location.replace("/admin")
      }
    })

    return () => {
      attivo = false
      subscription.unsubscribe()
    }
  }, [])

  if (stato !== "autorizzato") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-6">
        <div className="rounded-3xl bg-white p-8 text-center shadow">
          <p className="text-lg font-black text-slate-900">
            Verifica accesso amministratore...
          </p>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
