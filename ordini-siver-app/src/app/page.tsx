"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function Home() {
  const [utente, setUtente] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [verificaSessione, setVerificaSessione] = useState(true)
  const [errore, setErrore] = useState("")

  useEffect(() => {
    controllaSessione()
  }, [])

  function creaEmailInterna(valoreUtente: string) {
    const pulito = valoreUtente.trim().toLowerCase().replace(/\s+/g, "")
    return `${pulito}@local.siver.internal`
  }

  async function controllaSessione() {
    setVerificaSessione(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.app_metadata?.role === "locale") {
      const localeId = user.app_metadata.locale_id
      const localeNome = user.app_metadata.locale_nome

      if (localeId && localeNome) {
        localStorage.setItem("locale_id", String(localeId))
        localStorage.setItem("locale_nome", String(localeNome))
        window.location.href = "/dashboard"
        return
      }

      await supabase.auth.signOut()
      localStorage.removeItem("locale_id")
      localStorage.removeItem("locale_nome")
    }

    setVerificaSessione(false)
  }

  async function entra() {
    setErrore("")

    const utentePulito = utente.trim().toLowerCase()
    const passwordPulita = password.trim()

    if (!utentePulito || !passwordPulita) {
      setErrore("Inserisci utente e password.")
      return
    }

    setLoading(true)

    const emailInterna = creaEmailInterna(utentePulito)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInterna,
      password: passwordPulita,
    })

    if (error || !data.user) {
      setLoading(false)
      setErrore("Utente o password non corretti.")
      return
    }

    if (data.user.app_metadata?.role !== "locale") {
      await supabase.auth.signOut()
      localStorage.removeItem("locale_id")
      localStorage.removeItem("locale_nome")
      setLoading(false)
      setErrore("Questo utente non è autorizzato come locale.")
      return
    }

    const localeId = data.user.app_metadata.locale_id
    const localeNome = data.user.app_metadata.locale_nome

    if (!localeId || !localeNome) {
      await supabase.auth.signOut()
      localStorage.removeItem("locale_id")
      localStorage.removeItem("locale_nome")
      setLoading(false)
      setErrore("Utente senza locale assegnato.")
      return
    }

    localStorage.setItem("locale_id", String(localeId))
    localStorage.setItem("locale_nome", String(localeNome))

    window.location.href = "/dashboard"
  }

  if (verificaSessione) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="text-lg font-bold text-slate-700">
          Verifica sessione...
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-10">
        <div className="mb-8 rounded-3xl bg-slate-950 p-5 text-white">
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            OrdiniSiver
          </h1>

          <p className="mt-2 text-base font-semibold text-slate-200 sm:text-xl">
            Inserisci utente e password del locale.
          </p>
        </div>

        {errore && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
            {errore}
          </div>
        )}

        <label className="mb-2 block text-sm font-black uppercase text-slate-700">
          Utente
        </label>

        <input
          type="text"
          placeholder="Inserisci utente"
          value={utente}
          onChange={(e) => setUtente(e.target.value)}
          autoComplete="username"
          className="mb-5 h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
        />

        <label className="mb-2 block text-sm font-black uppercase text-slate-700">
          Password
        </label>

        <input
          type="password"
          placeholder="Inserisci password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") entra()
          }}
          className="mb-6 h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
        />

        <button
          onClick={entra}
          disabled={loading}
          className="h-14 w-full rounded-2xl bg-blue-600 text-xl font-black text-white shadow-lg active:scale-[0.99] disabled:bg-slate-400"
        >
          {loading ? "Accesso in corso..." : "Entra"}
        </button>

        <div className="mt-8 text-center">
          <a href="/admin" className="text-base font-bold text-slate-700 underline">
            Accesso Admin
          </a>
        </div>
      </div>
    </main>
  )
}