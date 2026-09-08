"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type LocaleScelta = {
  restaurant_id: string
  restaurant_name: string
  role?: string | null
}

export default function Home() {
  const [utente, setUtente] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [verificaSessione, setVerificaSessione] = useState(true)
  const [errore, setErrore] = useState("")
  const [utenteLoggato, setUtenteLoggato] = useState<any>(null)
  const [localiDisponibili, setLocaliDisponibili] = useState<LocaleScelta[]>([])

  useEffect(() => {
    controllaSessione()
  }, [])

  function creaEmailInterna(valoreUtente: string) {
    const pulito = valoreUtente.trim().toLowerCase().replace(/\s+/g, "")
    return `${pulito}@local.siver.internal`
  }

  function nomeUtente(user: any) {
    return (
      user?.user_metadata?.full_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.name ||
      `${user?.user_metadata?.nome || ""} ${user?.user_metadata?.cognome || ""}`.trim() ||
      user?.user_metadata?.utente ||
      "Utente"
    )
  }

  async function caricaLocaliUtente(user: any) {
    const { data, error } = await supabase
      .from("local_user_restaurants")
      .select("restaurant_id, restaurant_name, role")
      .eq("user_id", user.id)
      .order("restaurant_name", { ascending: true })

    if (error) {
      console.log(error)
      return []
    }

    if (data && data.length > 0) {
      return data as LocaleScelta[]
    }

    const localeId = user.app_metadata?.locale_id
    const localeNome = user.app_metadata?.locale_nome

    if (localeId && localeNome) {
      return [
        {
          restaurant_id: String(localeId),
          restaurant_name: String(localeNome),
          role: "responsabile",
        },
      ]
    }

    return []
  }

  function entraNelLocale(locale: LocaleScelta) {
    localStorage.setItem("locale_id", String(locale.restaurant_id))
    localStorage.setItem("locale_nome", String(locale.restaurant_name))
    localStorage.setItem("locale_scelto", "true")
    window.location.href = "/dashboard"
  }

  async function controllaSessione() {
    setVerificaSessione(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.app_metadata?.role === "locale") {
        const locali = await caricaLocaliUtente(user)

        if (locali.length === 1) {
          entraNelLocale(locali[0])
          return
        }

        if (locali.length > 1) {
          setUtenteLoggato(user)
          setLocaliDisponibili(locali)
          setVerificaSessione(false)
          return
        }

        await supabase.auth.signOut()
        localStorage.removeItem("locale_id")
        localStorage.removeItem("locale_nome")
        localStorage.removeItem("locale_scelto")
      }

      setVerificaSessione(false)
    } catch (error) {
      console.log(error)
      setErrore(
        "Non riesco a verificare la sessione. Controlla la connessione e riprova.",
      )
      setVerificaSessione(false)
    }
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
      localStorage.removeItem("locale_scelto")
      setLoading(false)
      setErrore("Questo utente non è autorizzato come locale.")
      return
    }

    const locali = await caricaLocaliUtente(data.user)

    if (locali.length === 0) {
      await supabase.auth.signOut()
      localStorage.removeItem("locale_id")
      localStorage.removeItem("locale_nome")
      localStorage.removeItem("locale_scelto")
      setLoading(false)
      setErrore("Utente senza locale assegnato.")
      return
    }

    if (locali.length === 1) {
      entraNelLocale(locali[0])
      return
    }

    setUtenteLoggato(data.user)
    setLocaliDisponibili(locali)
    setLoading(false)
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

  if (localiDisponibili.length > 1 && utenteLoggato) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
        <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-10">
          <div className="mb-8 rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-sm font-black uppercase tracking-wide text-blue-300">
              Selezione locale
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">
              Ciao, {nomeUtente(utenteLoggato)}
            </h1>
            <p className="mt-2 text-base font-semibold text-slate-300">
              Scegli il locale con cui vuoi lavorare.
            </p>
          </div>

          <div className="grid gap-3">
            {localiDisponibili.map((locale) => (
              <button
                key={locale.restaurant_id}
                onClick={() => entraNelLocale(locale)}
                className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition hover:border-blue-500 hover:bg-blue-50"
              >
                <p className="text-xl font-black text-slate-950">
                  {locale.restaurant_name}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Entra nel locale →
                </p>
              </button>
            ))}
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              localStorage.removeItem("locale_id")
              localStorage.removeItem("locale_nome")
              localStorage.removeItem("locale_scelto")
              setUtenteLoggato(null)
              setLocaliDisponibili([])
            }}
            className="mt-6 w-full rounded-2xl bg-red-500 p-4 font-black text-white"
          >
            Esci
          </button>
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