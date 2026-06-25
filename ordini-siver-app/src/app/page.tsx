"use client"

import { FormEvent, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function Home() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState("")

  useEffect(() => {
    verificaSessione()
  }, [])

  async function verificaSessione() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.app_metadata?.role === "locale") {
      await caricaProfiloLocale(user.id)
    }
  }

  async function caricaProfiloLocale(userId: string) {
    const { data: profilo, error: profiloError } = await supabase
      .from("locale_users")
      .select("id, nome, cognome, username, active")
      .eq("id", userId)
      .maybeSingle()

    if (profiloError || !profilo || !profilo.active) {
      await supabase.auth.signOut()
      setErrore("Utente non autorizzato o disattivato.")
      return
    }

    const { data: assegnazione, error: assegnazioneError } = await supabase
      .from("locale_user_assignments")
      .select("restaurant_id, restaurants!locale_user_assignments_restaurant_id_fkey(id, name)")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle()

    if (assegnazioneError || !assegnazione?.restaurants) {
      await supabase.auth.signOut()
      setErrore("Nessun locale attivo assegnato a questo responsabile.")
      return
    }

    const locale: any = assegnazione.restaurants

    localStorage.setItem("locale_id", String(locale.id))
    localStorage.setItem("locale_nome", locale.name)
    localStorage.setItem("restaurant_name", locale.name)
    localStorage.setItem("user_id", profilo.id)
    localStorage.setItem("user_name", `${profilo.nome} ${profilo.cognome || ""}`.trim())
    localStorage.setItem("username", profilo.username || "")
    localStorage.removeItem("admin_mode")

    await supabase
      .from("locale_users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userId)

    await supabase.from("activity_log").insert({
      user_id: profilo.id,
      user_name: `${profilo.nome} ${profilo.cognome || ""}`.trim(),
      restaurant_id: locale.id,
      restaurant_name: locale.name,
      action: "login_locale",
      entity: "auth",
      entity_id: profilo.id,
      details: {
        username: profilo.username,
      },
    })

    window.location.href = "/dashboard"
  }

  async function entra(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore("")

    const usernamePulito = username.trim().toLowerCase()
    const technicalEmail = `${usernamePulito}@ordinisiver.local`

    const { data, error } = await supabase.auth.signInWithPassword({
      email: technicalEmail,
      password,
    })

    if (error || !data.user) {
      setErrore("Username o password non validi.")
      setLoading(false)
      return
    }

    if (data.user.app_metadata?.role !== "locale") {
      await supabase.auth.signOut()
      setErrore("Questo account non è autorizzato come responsabile locale.")
      setLoading(false)
      return
    }

    await caricaProfiloLocale(data.user.id)
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-10">
        <div className="mb-8 rounded-3xl bg-slate-950 p-5 text-white">
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            OrdiniSiver
          </h1>

          <p className="mt-2 text-base font-semibold text-slate-200 sm:text-xl">
            Accedi con username e password.
          </p>
        </div>

        {errore && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
            {errore}
          </div>
        )}

        <form onSubmit={entra} autoComplete="off">
          <label className="mb-2 block text-sm font-black uppercase text-slate-700">
            Username
          </label>

          <input
            type="text"
            placeholder="Inserisci username"
            value={username}
            autoComplete="off"
            onChange={(e) => setUsername(e.target.value)}
            className="mb-5 h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
          />

          <label className="mb-2 block text-sm font-black uppercase text-slate-700">
            Password
          </label>

          <input
            type="password"
            placeholder="Inserisci password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
          />

          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-blue-600 text-xl font-black text-white shadow-lg active:scale-[0.99] disabled:bg-slate-400"
          >
            {loading ? "Accesso..." : "Accedi"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a href="/admin" className="text-base font-bold text-slate-700 underline">
            Accesso Admin
          </a>
        </div>
      </div>
    </main>
  )
}