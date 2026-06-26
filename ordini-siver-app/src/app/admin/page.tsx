"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errore, setErrore] = useState("")
  const [caricamento, setCaricamento] = useState(false)
  const [verificaSessione, setVerificaSessione] = useState(true)

  useEffect(() => {
    let attivo = true

    async function controllaSessione() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!attivo) return

      if (user?.app_metadata?.role === "admin") {
        router.replace("/admin-dashboard")
        return
      }

      localStorage.removeItem("admin")
      localStorage.removeItem("admin_mode")
      setVerificaSessione(false)
    }

    controllaSessione()

    return () => {
      attivo = false
    }
  }, [router])

  async function loginAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrore("")
    setCaricamento(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      setCaricamento(false)
      setErrore("Credenziali non valide.")
      return
    }

    if (data.user.app_metadata?.role !== "admin") {
      await supabase.auth.signOut()
      localStorage.removeItem("admin")
      localStorage.removeItem("admin_mode")
      setCaricamento(false)
      setErrore("Utente non autorizzato come admin.")
      return
    }

    localStorage.setItem("admin", "true")
    localStorage.setItem("admin_mode", "true")
    router.replace("/admin-dashboard")
  }

  if (verificaSessione) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Verifica sessione admin...
      </div>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Accesso Admin
        </h1>

        <p className="text-sm text-slate-500 mb-6">
          Inserisci le credenziali amministratore.
        </p>

        <form onSubmit={loginAdmin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {errore && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {errore}
            </div>
          )}

          <button
            type="submit"
            disabled={caricamento}
            className="w-full rounded-xl bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {caricamento ? "Accesso in corso..." : "Entra"}
          </button>
        </form>
      </div>
    </main>
  )
}