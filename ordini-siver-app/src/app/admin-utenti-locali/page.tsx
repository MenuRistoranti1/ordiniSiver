"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Restaurant = {
  id: string
  name: string
}

type LocaleUser = {
  id: string
  nome: string
  cognome: string | null
  email: string
  ruolo_generale: string | null
  active: boolean
  created_at: string
  last_login: string | null
}

type Assignment = {
  id: string
  user_id: string
  restaurant_id: string
  ruolo_nel_locale: string | null
  active: boolean
  valid_from: string | null
  valid_to: string | null
  locale_users?: LocaleUser | null
  restaurants?: Restaurant | null
}

export default function AdminUtentiLocaliPage() {
  const [loading, setLoading] = useState(false)
  const [creazione, setCreazione] = useState(false)
  const [messaggio, setMessaggio] = useState("")
  const [errore, setErrore] = useState("")

  const [utenti, setUtenti] = useState<LocaleUser[]>([])
  const [locali, setLocali] = useState<Restaurant[]>([])
  const [assegnazioni, setAssegnazioni] = useState<Assignment[]>([])

  const [ricerca, setRicerca] = useState("")
  const [filtroLocale, setFiltroLocale] = useState("")

  const [nome, setNome] = useState("")
  const [cognome, setCognome] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [ruoloGenerale, setRuoloGenerale] = useState("responsabile")
  const [localeId, setLocaleId] = useState("")
  const [ruoloLocale, setRuoloLocale] = useState("responsabile")

  const [utenteDaAssegnare, setUtenteDaAssegnare] = useState("")
  const [localeDaAssegnare, setLocaleDaAssegnare] = useState("")
  const [ruoloDaAssegnare, setRuoloDaAssegnare] = useState("responsabile")

  useEffect(() => {
    caricaTutto()
  }, [])

  function ok(msg: string) {
    setMessaggio(msg)
    setErrore("")
  }

  function ko(msg: string) {
    setErrore(msg)
    setMessaggio("")
  }

  async function caricaTutto() {
    setLoading(true)

    const [utentiRes, localiRes, assegnazioniRes] = await Promise.all([
      supabase.from("locale_users").select("*").order("nome", { ascending: true }),
      supabase.from("restaurants").select("id, name").eq("active", true).order("name", { ascending: true }),
      supabase
        .from("locale_user_assignments")
        .select("*, locale_users (*), restaurants (id, name)")
        .order("created_at", { ascending: false }),
    ])

    if (utentiRes.error) ko(utentiRes.error.message)
    if (localiRes.error) ko(localiRes.error.message)
    if (assegnazioniRes.error) ko(assegnazioniRes.error.message)

    setUtenti(utentiRes.data || [])
    setLocali(localiRes.data || [])
    setAssegnazioni(assegnazioniRes.data || [])

    setLoading(false)
  }

  async function creaUtente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!nome.trim() || !email.trim() || !password.trim()) {
      ko("Nome, email e password sono obbligatori.")
      return
    }

    if (password.length < 8) {
      ko("La password deve contenere almeno 8 caratteri.")
      return
    }

    setCreazione(true)

    try {
      const res = await fetch("/api/admin-create-locale-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          cognome: cognome.trim(),
          email: email.trim(),
          password,
          ruolo_generale: ruoloGenerale,
          restaurant_id: localeId || null,
          ruolo_nel_locale: ruoloLocale,
        }),
      })

      const json = await res.json()

      if (!res.ok) throw new Error(json?.error || "Errore creazione utente")

      ok("Utente creato correttamente.")

      setNome("")
      setCognome("")
      setEmail("")
      setPassword("")
      setRuoloGenerale("responsabile")
      setLocaleId("")
      setRuoloLocale("responsabile")

      await caricaTutto()
    } catch (error: any) {
      ko(error?.message || "Errore creazione utente")
    }

    setCreazione(false)
  }

  async function assegnaLocale(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!utenteDaAssegnare || !localeDaAssegnare) {
      ko("Seleziona utente e locale.")
      return
    }

    const { error } = await supabase.from("locale_user_assignments").upsert(
      {
        user_id: utenteDaAssegnare,
        restaurant_id: localeDaAssegnare,
        ruolo_nel_locale: ruoloDaAssegnare,
        active: true,
        valid_from: new Date().toISOString().split("T")[0],
      },
      { onConflict: "user_id,restaurant_id" }
    )

    if (error) {
      ko(error.message)
      return
    }

    ok("Assegnazione salvata.")
    setUtenteDaAssegnare("")
    setLocaleDaAssegnare("")
    setRuoloDaAssegnare("responsabile")
    await caricaTutto()
  }

  async function cambiaStatoUtente(utente: LocaleUser) {
    const { error } = await supabase
      .from("locale_users")
      .update({ active: !utente.active })
      .eq("id", utente.id)

    if (error) {
      ko(error.message)
      return
    }

    ok(utente.active ? "Utente disattivato." : "Utente riattivato.")
    await caricaTutto()
  }

  async function cambiaStatoAssegnazione(assegnazione: Assignment) {
    const { error } = await supabase
      .from("locale_user_assignments")
      .update({
        active: !assegnazione.active,
        valid_to: assegnazione.active ? new Date().toISOString().split("T")[0] : null,
      })
      .eq("id", assegnazione.id)

    if (error) {
      ko(error.message)
      return
    }

    ok(assegnazione.active ? "Assegnazione disattivata." : "Assegnazione riattivata.")
    await caricaTutto()
  }

  const utentiFiltrati = useMemo(() => {
    const r = ricerca.toLowerCase().trim()

    return utenti.filter((u) => {
      const testo = [u.nome, u.cognome, u.email, u.ruolo_generale]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      if (r && !testo.includes(r)) return false

      if (filtroLocale) {
        return assegnazioni.some(
          (a) => a.user_id === u.id && String(a.restaurant_id) === String(filtroLocale) && a.active
        )
      }

      return true
    })
  }, [utenti, ricerca, filtroLocale, assegnazioni])

  function nomeCompleto(u?: LocaleUser | null) {
    if (!u) return "-"
    return `${u.nome || ""} ${u.cognome || ""}`.trim()
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Amministrazione</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-5xl">Utenti locali</h1>
          <p className="mt-2 font-bold text-slate-500">
            Crea utenti personali, assegna responsabili ai locali e abilita il tracciamento delle operazioni.
          </p>
        </header>

        {errore && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">{errore}</div>}
        {messaggio && <div className="rounded-2xl border border-green-200 bg-green-50 p-4 font-black text-green-700">{messaggio}</div>}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <form onSubmit={creaUtente} className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-black text-slate-950">Crea nuovo utente</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className="rounded-2xl border p-4 font-bold" />
              <input value={cognome} onChange={(e) => setCognome(e.target.value)} placeholder="Cognome" className="rounded-2xl border p-4 font-bold" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="rounded-2xl border p-4 font-bold sm:col-span-2" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password iniziale" type="password" className="rounded-2xl border p-4 font-bold sm:col-span-2" />

              <select value={ruoloGenerale} onChange={(e) => setRuoloGenerale(e.target.value)} className="rounded-2xl border p-4 font-bold">
                <option value="responsabile">Responsabile</option>
                <option value="vice_responsabile">Vice Responsabile</option>
                <option value="supervisore">Supervisore</option>
                <option value="magazzino">Magazzino</option>
              </select>

              <select value={localeId} onChange={(e) => setLocaleId(e.target.value)} className="rounded-2xl border p-4 font-bold">
                <option value="">Nessun locale iniziale</option>
                {locali.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

              <select value={ruoloLocale} onChange={(e) => setRuoloLocale(e.target.value)} className="rounded-2xl border p-4 font-bold sm:col-span-2">
                <option value="responsabile">Responsabile locale</option>
                <option value="vice_responsabile">Vice Responsabile</option>
                <option value="supervisore">Supervisore</option>
                <option value="magazzino">Magazzino</option>
              </select>
            </div>

            <button type="submit" disabled={creazione} className="mt-4 w-full rounded-2xl bg-blue-600 p-4 text-xl font-black text-white disabled:bg-slate-400">
              {creazione ? "Creazione..." : "Crea utente"}
            </button>
          </form>

          <form onSubmit={assegnaLocale} className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-black text-slate-950">Assegna utente a locale</h2>

            <div className="space-y-3">
              <select value={utenteDaAssegnare} onChange={(e) => setUtenteDaAssegnare(e.target.value)} className="w-full rounded-2xl border p-4 font-bold">
                <option value="">Seleziona utente</option>
                {utenti.map((u) => <option key={u.id} value={u.id}>{nomeCompleto(u)} - {u.email}</option>)}
              </select>

              <select value={localeDaAssegnare} onChange={(e) => setLocaleDaAssegnare(e.target.value)} className="w-full rounded-2xl border p-4 font-bold">
                <option value="">Seleziona locale</option>
                {locali.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

              <select value={ruoloDaAssegnare} onChange={(e) => setRuoloDaAssegnare(e.target.value)} className="w-full rounded-2xl border p-4 font-bold">
                <option value="responsabile">Responsabile</option>
                <option value="vice_responsabile">Vice Responsabile</option>
                <option value="supervisore">Supervisore</option>
                <option value="magazzino">Magazzino</option>
              </select>

              <button className="w-full rounded-2xl bg-emerald-600 p-4 text-xl font-black text-white">Salva assegnazione</button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input value={ricerca} onChange={(e) => setRicerca(e.target.value)} placeholder="Cerca nome, email, ruolo..." className="flex-1 rounded-2xl border p-4 font-bold" />

            <select value={filtroLocale} onChange={(e) => setFiltroLocale(e.target.value)} className="rounded-2xl border p-4 font-bold">
              <option value="">Tutti i locali</option>
              {locali.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            <button type="button" onClick={caricaTutto} className="rounded-2xl bg-slate-950 px-5 py-4 font-black text-white">Aggiorna</button>
          </div>

          <h2 className="mb-4 text-2xl font-black text-slate-950">Utenti</h2>

          {loading ? (
            <p className="font-bold text-slate-500">Caricamento...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs font-black uppercase text-slate-500">
                    <th className="p-3">Utente</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Ruolo</th>
                    <th className="p-3">Locali assegnati</th>
                    <th className="p-3">Stato</th>
                    <th className="p-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {utentiFiltrati.map((utente) => {
                    const assegnati = assegnazioni.filter((a) => a.user_id === utente.id && a.active)

                    return (
                      <tr key={utente.id} className="rounded-2xl bg-slate-50">
                        <td className="p-3 font-black text-slate-950">{nomeCompleto(utente)}</td>
                        <td className="p-3 font-bold text-slate-700">{utente.email}</td>
                        <td className="p-3 font-bold text-slate-700">{utente.ruolo_generale || "-"}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {assegnati.length === 0 && <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-black text-slate-600">Nessun locale</span>}
                            {assegnati.map((a) => (
                              <span key={a.id} className="rounded-full bg-blue-100 px-2 py-1 text-xs font-black text-blue-700">
                                {a.restaurants?.name || a.restaurant_id}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${utente.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {utente.active ? "Attivo" : "Disattivato"}
                          </span>
                        </td>
                        <td className="p-3">
                          <button type="button" onClick={() => cambiaStatoUtente(utente)} className={`rounded-xl px-3 py-2 text-xs font-black text-white ${utente.active ? "bg-red-500" : "bg-green-600"}`}>
                            {utente.active ? "Disattiva" : "Riattiva"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-2xl font-black text-slate-950">Assegnazioni</h2>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {assegnazioni.map((a) => (
              <div key={a.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{nomeCompleto(a.locale_users)}</h3>
                    <p className="font-bold text-slate-600">{a.restaurants?.name || a.restaurant_id}</p>
                    <p className="mt-1 text-sm font-bold text-slate-500">Ruolo: {a.ruolo_nel_locale || "-"}</p>
                  </div>

                  <button type="button" onClick={() => cambiaStatoAssegnazione(a)} className={`rounded-xl px-3 py-2 text-xs font-black text-white ${a.active ? "bg-red-500" : "bg-green-600"}`}>
                    {a.active ? "Disattiva" : "Riattiva"}
                  </button>
                </div>

                <div className="mt-3 text-xs font-bold text-slate-500">
                  Dal: {a.valid_from || "-"} · Al: {a.valid_to || "-"}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
