"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Restaurant = {
  id: string
  name: string
}

type Responsabile = {
  id: string
  nome: string
  cognome: string | null
  username: string | null
  technical_email: string | null
  active: boolean
  last_login: string | null
  locale_user_assignments?: {
    id: string
    restaurant_id: string
    active: boolean
    restaurants?: Restaurant | null
  }[]
}

export default function AdminUtentiLocaliPage() {
  const [loading, setLoading] = useState(false)
  const [creazione, setCreazione] = useState(false)
  const [messaggio, setMessaggio] = useState("")
  const [errore, setErrore] = useState("")

  const [locali, setLocali] = useState<Restaurant[]>([])
  const [responsabili, setResponsabili] = useState<Responsabile[]>([])

  const [nome, setNome] = useState("")
  const [cognome, setCognome] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [localeId, setLocaleId] = useState("")

  const [ricerca, setRicerca] = useState("")
  const [filtroLocale, setFiltroLocale] = useState("")

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

    const [localiRes, responsabiliRes] = await Promise.all([
      supabase
        .from("restaurants")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: true }),
      supabase
        .from("locale_users")
        .select(`
          id,
          nome,
          cognome,
          username,
          technical_email,
          active,
          last_login,
          locale_user_assignments (
            id,
            restaurant_id,
            active,
            restaurants (id, name)
          )
        `)
        .order("nome", { ascending: true }),
    ])

    if (localiRes.error) ko(localiRes.error.message)
    if (responsabiliRes.error) ko(responsabiliRes.error.message)

    setLocali(localiRes.data || [])
    setResponsabili((responsabiliRes.data || []) as unknown as Responsabile[])
    setLoading(false)
  }

  function normalizzaUsername(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ".")
      .replace(/[^a-z0-9._-]/g, "")
  }

  async function creaResponsabile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const usernamePulito = normalizzaUsername(username)

    if (!nome.trim() || !cognome.trim() || !usernamePulito || !password || !localeId) {
      ko("Compila nome, cognome, username, password e locale.")
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
          username: usernamePulito,
          password,
          restaurant_id: localeId,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || "Errore creazione responsabile")
      }

      ok("Responsabile creato correttamente.")

      setNome("")
      setCognome("")
      setUsername("")
      setPassword("")
      setLocaleId("")

      await caricaTutto()
    } catch (error: any) {
      ko(error?.message || "Errore creazione responsabile")
    }

    setCreazione(false)
  }

  function assegnazioneAttiva(r: Responsabile) {
    return (r.locale_user_assignments || []).find((a) => a.active)
  }

  async function cambiaLocale(responsabile: Responsabile, nuovoLocaleId: string) {
    if (!nuovoLocaleId) return

    const attiva = assegnazioneAttiva(responsabile)

    if (attiva) {
      const { error: chiudiError } = await supabase
        .from("locale_user_assignments")
        .update({
          active: false,
          valid_to: new Date().toISOString().split("T")[0],
        })
        .eq("id", attiva.id)

      if (chiudiError) {
        ko(chiudiError.message)
        return
      }
    }

    const { error } = await supabase
      .from("locale_user_assignments")
      .upsert(
        {
          user_id: responsabile.id,
          restaurant_id: nuovoLocaleId,
          ruolo_nel_locale: "responsabile",
          active: true,
          valid_from: new Date().toISOString().split("T")[0],
          valid_to: null,
        },
        { onConflict: "user_id,restaurant_id" }
      )

    if (error) {
      ko(error.message)
      return
    }

    const locale = locali.find((l) => l.id === nuovoLocaleId)

    await supabase.from("activity_log").insert({
      user_id: responsabile.id,
      user_name: nomeCompleto(responsabile),
      restaurant_id: nuovoLocaleId,
      restaurant_name: locale?.name || "",
      action: "responsabile_cambio_locale",
      entity: "locale_user_assignments",
      entity_id: responsabile.id,
      details: {
        nuovo_locale_id: nuovoLocaleId,
        nuovo_locale_nome: locale?.name || "",
      },
    })

    ok("Locale aggiornato.")
    await caricaTutto()
  }

  async function cambiaStato(responsabile: Responsabile) {
    const nuovoStato = !responsabile.active

    const { error } = await supabase
      .from("locale_users")
      .update({ active: nuovoStato })
      .eq("id", responsabile.id)

    if (error) {
      ko(error.message)
      return
    }

    await supabase.from("activity_log").insert({
      user_id: responsabile.id,
      user_name: nomeCompleto(responsabile),
      action: nuovoStato ? "responsabile_riattivato" : "responsabile_disattivato",
      entity: "locale_users",
      entity_id: responsabile.id,
      details: {},
    })

    ok(nuovoStato ? "Responsabile riattivato." : "Responsabile disattivato.")
    await caricaTutto()
  }

  const filtrati = useMemo(() => {
    const r = ricerca.trim().toLowerCase()

    return responsabili.filter((resp) => {
      const attiva = assegnazioneAttiva(resp)

      if (filtroLocale && attiva?.restaurant_id !== filtroLocale) return false

      if (!r) return true

      const testo = [
        resp.nome,
        resp.cognome,
        resp.username,
        attiva?.restaurants?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return testo.includes(r)
    })
  }, [responsabili, ricerca, filtroLocale])

  function nomeCompleto(r: Responsabile) {
    return `${r.nome || ""} ${r.cognome || ""}`.trim()
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            Amministrazione
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-5xl">
            Responsabili locali
          </h1>
          <p className="mt-2 font-bold text-slate-500">
            Crea responsabili, assegna il locale operativo e gestisci gli accessi personali.
          </p>
        </header>

        {errore && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">
            {errore}
          </div>
        )}

        {messaggio && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 font-black text-green-700">
            {messaggio}
          </div>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-2xl font-black text-slate-950">
            Crea nuovo responsabile
          </h2>

          <form onSubmit={creaResponsabile} className="grid grid-cols-1 gap-3 lg:grid-cols-6">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome"
              autoComplete="off"
              className="rounded-2xl border p-4 font-bold"
            />

            <input
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              placeholder="Cognome"
              autoComplete="off"
              className="rounded-2xl border p-4 font-bold"
            />

            <input
              value={username}
              onChange={(e) => setUsername(normalizzaUsername(e.target.value))}
              placeholder="Username"
              autoComplete="off"
              className="rounded-2xl border p-4 font-bold"
            />

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete="new-password"
              className="rounded-2xl border p-4 font-bold"
            />

            <select
              value={localeId}
              onChange={(e) => setLocaleId(e.target.value)}
              className="rounded-2xl border p-4 font-bold"
            >
              <option value="">Locale</option>
              {locali.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <button
              disabled={creazione}
              className="rounded-2xl bg-blue-600 p-4 text-lg font-black text-white disabled:bg-slate-400"
            >
              {creazione ? "Creo..." : "Crea"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row">
            <input
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca responsabile, username o locale..."
              className="flex-1 rounded-2xl border p-4 font-bold"
            />

            <select
              value={filtroLocale}
              onChange={(e) => setFiltroLocale(e.target.value)}
              className="rounded-2xl border p-4 font-bold"
            >
              <option value="">Tutti i locali</option>
              {locali.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={caricaTutto}
              className="rounded-2xl bg-slate-950 px-5 py-4 font-black text-white"
            >
              Aggiorna
            </button>
          </div>

          <h2 className="mb-4 text-2xl font-black text-slate-950">
            Elenco responsabili
          </h2>

          {loading ? (
            <p className="font-bold text-slate-500">Caricamento...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs font-black uppercase text-slate-500">
                    <th className="p-3">Responsabile</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Locale attuale</th>
                    <th className="p-3">Ultimo accesso</th>
                    <th className="p-3">Stato</th>
                    <th className="p-3">Cambia locale</th>
                    <th className="p-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrati.map((resp) => {
                    const attiva = assegnazioneAttiva(resp)

                    return (
                      <tr key={resp.id} className="bg-slate-50">
                        <td className="rounded-l-2xl p-3 font-black text-slate-950">
                          {nomeCompleto(resp)}
                        </td>
                        <td className="p-3 font-bold text-slate-700">
                          {resp.username || "-"}
                        </td>
                        <td className="p-3 font-bold text-slate-700">
                          {attiva?.restaurants?.name || "Nessun locale"}
                        </td>
                        <td className="p-3 font-bold text-slate-600">
                          {resp.last_login
                            ? new Date(resp.last_login).toLocaleString("it-IT")
                            : "-"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              resp.active
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {resp.active ? "Attivo" : "Disattivato"}
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            value={attiva?.restaurant_id || ""}
                            onChange={(e) => cambiaLocale(resp, e.target.value)}
                            className="w-full rounded-xl border bg-white p-3 text-sm font-bold"
                          >
                            <option value="">Seleziona locale</option>
                            {locali.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="rounded-r-2xl p-3">
                          <button
                            type="button"
                            onClick={() => cambiaStato(resp)}
                            className={`rounded-xl px-3 py-2 text-xs font-black text-white ${
                              resp.active ? "bg-red-500" : "bg-green-600"
                            }`}
                          >
                            {resp.active ? "Disattiva" : "Riattiva"}
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
      </div>
    </main>
  )
}
