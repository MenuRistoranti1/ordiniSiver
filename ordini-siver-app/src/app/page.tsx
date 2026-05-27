"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function Home() {
  const [locali, setLocali] = useState<any[]>([])
  const [localeId, setLocaleId] = useState("")
  const [pin, setPin] = useState("")

  useEffect(() => {
    caricaLocali()
  }, [])

  async function caricaLocali() {
    const { data } = await supabase
      .from("restaurants")
      .select("id, name, pin_code")
      .order("name", { ascending: true })

    setLocali(data || [])
  }

  function entra() {
    const locale = locali.find((l) => l.id === localeId)

    if (!locale) {
      alert("Seleziona un locale")
      return
    }

    if (String(locale.pin_code) !== String(pin)) {
      alert("PIN errato")
      return
    }

    localStorage.setItem("locale_id", locale.id)
    localStorage.setItem("locale_nome", locale.name)

    window.location.href = "/dashboard"
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-10">
        <div className="mb-8 rounded-3xl bg-slate-950 p-5 text-white">
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            OrdiniSiver
          </h1>

          <p className="mt-2 text-base font-semibold text-slate-200 sm:text-xl">
            Seleziona il locale e inserisci il PIN.
          </p>
        </div>

        <label className="mb-2 block text-sm font-black uppercase text-slate-700">
          Locale
        </label>

        <select
          value={localeId}
          onChange={(e) => setLocaleId(e.target.value)}
          className="mb-5 h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-950 outline-none focus:border-blue-600"
        >
          <option value="">Seleziona locale</option>

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
          className="h-14 w-full rounded-2xl bg-blue-600 text-xl font-black text-white shadow-lg active:scale-[0.99]"
        >
          Entra
        </button>

        <div className="mt-8 text-center">
          <a
            href="/admin"
            className="text-base font-bold text-slate-700 underline"
          >
            Accesso Admin
          </a>
        </div>
      </div>
    </main>
  )
}