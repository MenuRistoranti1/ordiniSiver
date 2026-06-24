"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function Home() {
  const [locali, setLocali] = useState<any[]>([])
  const [localeId, setLocaleId] = useState("")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState("")

  useEffect(() => {
    caricaLocali()
  }, [])

  async function caricaLocali() {
    setLoading(true)
    setErrore("")

    console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, pin_code, active")
      .order("name", { ascending: true })

    console.log("LOCALI DATA:", data)
    console.log("LOCALI ERROR:", error)

    if (error) {
      setErrore(error.message)
      setLocali([])
      setLoading(false)
      return
    }

    setLocali(data || [])
    setLoading(false)
  }

  function entra() {
    const locale = locali.find((l) => String(l.id) === String(localeId))

    if (!locale) {
      alert("Seleziona un locale")
      return
    }

    if (String(locale.pin_code).trim() !== String(pin).trim()) {
      alert("PIN errato")
      return
    }

    localStorage.setItem("locale_id", locale.id)
    localStorage.setItem("locale_nome", locale.name)

    window.location.href = "/dashboard"
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-10">
        <div className="mb-8 rounded-3xl bg-slate-950 p-5 text-white">
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            OrdiniSiver
          </h1>

          <p className="mt-2 text-base font-semibold text-slate-200 sm:text-xl">
            Seleziona il locale e inserisci il PIN.
          </p>
        </div>

        {errore && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
            Errore caricamento locali: {errore}
          </div>
        )}

        <label className="mb-2 block text-sm font-black uppercase text-slate-700">
          Locale
        </label>

        <select
          value={localeId}
          onChange={(e) => setLocaleId(e.target.value)}
          disabled={loading}
          className="mb-5 h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-950 outline-none focus:border-blue-600 disabled:bg-slate-100"
        >
          <option value="">
            {loading ? "Caricamento locali..." : "Seleziona locale"}
          </option>

          {locali.map((locale) => (
            <option key={locale.id} value={locale.id}>
              {locale.name}
            </option>
          ))}
        </select>

        <label className="mb-2 block text-sm font-black uppercase text-slate-700">
          PIN
        </label>

        <input
          type="password"
          placeholder="Inserisci PIN locale"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
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
          Entra
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