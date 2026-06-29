"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AdminLoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errore, setErrore] = useState("")
  const [messaggio, setMessaggio] = useState("")
  const [caricamento, setCaricamento] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
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
    setMessaggio("")
    setCaricamento(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
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

  async function inviaResetPassword() {
    setErrore("")
    setMessaggio("")

    if (!email.trim()) {
      setErrore("Inserisci prima la tua email admin.")
      return
    }

    setResetLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setErrore(error.message)
      setResetLoading(false)
      return
    }

    setMessaggio("Email di reset inviata. Controlla la posta.")
    setResetLoading(false)
  }

  if (verificaSessione) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Verifica sessione admin...
      </div>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Accesso Admin
        </h1>

        <p className="mb-6 text-sm text-slate-500">
          Inserisci le credenziali amministratore.
        </p>

        <form onSubmit={loginAdmin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
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
            <label className="mb-1 block text-sm font-medium text-slate-700">
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errore}
            </div>
          )}

          {messaggio && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {messaggio}
            </div>
          )}

          <button
            type="submit"
            disabled={caricamento}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {caricamento ? "Accesso in corso..." : "Entra"}
          </button>

          <button
            type="button"
            onClick={inviaResetPassword}
            disabled={resetLoading}
            className="w-full text-sm font-bold text-slate-600 underline disabled:opacity-60"
          >
            {resetLoading ? "Invio email..." : "Password dimenticata?"}
          </button>
        </form>
      </div>
    </main>
  )
}