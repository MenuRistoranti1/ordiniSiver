"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type StatoAccesso = "verifica" | "autorizzato" | "negato"

export default function AdminRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [stato, setStato] = useState<StatoAccesso>("verifica")

  useEffect(() => {
    let attivo = true

    async function verificaAccesso() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (!attivo) return

      const adminAutorizzato =
        !error && user?.app_metadata?.role === "admin"

      if (!adminAutorizzato) {
        localStorage.removeItem("admin")
        localStorage.removeItem("admin_mode")
        setStato("negato")

        if (window.location.pathname !== "/admin") {
          router.replace("/admin")
        }

        return
      }

      localStorage.setItem("admin", "true")
      localStorage.setItem("admin_mode", "true")
      setStato("autorizzato")
    }

    verificaAccesso()

    return () => {
      attivo = false
    }
  }, [router])

  if (stato === "verifica") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Verifica accesso admin...
      </div>
    )
  }

  if (stato === "negato") {
    return null
  }

  return <>{children}</>
}