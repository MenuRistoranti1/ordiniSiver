"use client"

import { FormEvent, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState("")

  useEffect(() => {
    async function verificaSessioneEsistente() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.app_metadata?.role === "admin") {
        window.location.replace("/admin-dashboard")
      }
    }

    verificaSessioneEsistente()
  }, [])

  async function entra(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore("")

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error || !data.user) {
      setErrore("Credenziali non valide.")
      setLoading(false)
      return
    }

    if (data.user.app_metadata?.role !== "admin") {
      await supabase.auth.signOut()
      setErrore("Questo account non è autorizzato come amministratore.")
      setLoading(false)
      return
    }

    window.location.replace("/admin-dashboard")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4 sm:p-12">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl sm:p-10">
        <h1 className="mb-2 text-4xl font-black text-slate-950 sm:text-5xl">
          Accesso Admin
        </h1>
        <p className="mb-8 font-bold text-slate-500">
          Inserisci le credenziali amministratore.
        </p>

        <form onSubmit={entra}>
          <label className="mb-2 block font-black text-slate-800">Email</label>
          <input
            type="email"
            autoComplete="username"
            placeholder="admin@azienda.it"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mb-5 w-full rounded-2xl border p-4 text-xl text-slate-900"
          />

          <label className="mb-2 block font-black text-slate-800">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mb-5 w-full rounded-2xl border p-4 text-xl text-slate-900"
          />

          {errore && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
              {errore}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 p-5 text-2xl font-black text-white disabled:bg-slate-400 sm:text-3xl"
          >
            {loading ? "Accesso..." : "Entra"}
          </button>
        </form>
      </div>
    </main>
  )
}
