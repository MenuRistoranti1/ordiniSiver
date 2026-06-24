"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AdminStoricoOrdini() {
  const [ordini, setOrdini] = useState<any[]>([])
  const [locali, setLocali] = useState<any[]>([])
  const [localeNome, setLocaleNome] = useState("Tutti i locali")
  const [gruppoAperto, setGruppoAperto] = useState<string | null>(null)
  const [ricerca, setRicerca] = useState("")
  const [localeFiltro, setLocaleFiltro] = useState("tutti")
  const [ordinamento, setOrdinamento] = useState("data")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

    caricaDati()
  }, [])

  async function caricaDati() {
    setLoading(true)

    const { data: localiDb } = await supabase
      .from("restaurants")
      .select("id, name")
      .order("name")

    const { data: ordiniDb, error } = await supabase
      .from("ordini")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.log(error)
      alert("Errore caricamento ordini")
      setLoading(false)
      return
    }

    setLocali(localiDb || [])
    setOrdini(ordiniDb || [])
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

  const ordiniFiltrati = useMemo(() => {
    let lista = [...ordini]

    if (localeFiltro !== "tutti") {
      lista = lista.filter((ordine) => ordine.locale_id === localeFiltro)

      const locale = locali.find((l) => l.id === localeFiltro)
      if (locale) setLocaleNome(locale.name)
    } else {
      setLocaleNome("Tutti i locali")
    }

    if (ricerca.trim()) {
      const q = ricerca.toLowerCase()

      lista = lista.filter((ordine) =>
        [
          ordine.nome_prodotto,
          ordine.locale_nome,
          ordine.responsabile,
          ordine.settimana_key,
          ordine.misure,
        ]
          .filter(Boolean)
          .some((valore) => String(valore).toLowerCase().includes(q))
      )
    }

    return lista
  }, [ordini, ricerca, localeFiltro, locali])

  const gruppi = useMemo(() => {
    const gruppati = Object.values(
      ordiniFiltrati.reduce((acc: any, item: any) => {
        const settimana =
          item.settimana_key || item.created_at?.split("T")[0] || "Senza data"
        const locale = item.locale_nome || "Locale"
        const responsabile = item.responsabile || "Senza responsabile"
        const chiave = `${settimana}-${locale}-${responsabile}`

        if (!acc[chiave]) {
          acc[chiave] = {
            id: chiave,
            settimana,
            locale,
            responsabile,
            created_at: item.created_at,
            prodotti: [],
          }
        }

        acc[chiave].prodotti.push(item)
        return acc
      }, {})
    ) as any[]

    return gruppati.sort((a, b) => {
      if (ordinamento === "locale") {
        return String(a.locale).localeCompare(String(b.locale))
      }

      if (ordinamento === "prodotti") {
        return b.prodotti.length - a.prodotti.length
      }

      if (ordinamento === "quantita") {
        return totaleGruppo(b) - totaleGruppo(a)
      }

      return String(b.settimana).localeCompare(String(a.settimana))
    })
  }, [ordiniFiltrati, ordinamento])

  function totaleGruppo(gruppo: any) {
    return gruppo.prodotti.reduce(
      (sum: number, item: any) => sum + Number(item.quantita || 0),
      0
    )
  }

  const totaleQuantita = useMemo(() => {
    return ordiniFiltrati.reduce(
      (sum, item) => sum + Number(item.quantita || 0),
      0
    )
  }, [ordiniFiltrati])

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                OrdiniSiver
              </h1>
              <p className="mt-0.5 text-xs font-medium text-slate-300">
                Admin · Storico ordini
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white"
            >
              Logout
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => (window.location.href = "/admin-dashboard")}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Home Admin
            </button>

            <button
              onClick={() => window.history.back()}
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white"
            >
              Indietro
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            Storico ordini
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
            Locale: {localeNome}
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Ordini
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {gruppi.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Righe prodotto
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {ordiniFiltrati.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Quantità totali
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {totaleQuantita}
            </p>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="Cerca prodotto, locale, responsabile..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
          />

          <select
            value={localeFiltro}
            onChange={(e) => setLocaleFiltro(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
          >
            <option value="tutti">Tutti i locali</option>
            {locali.map((locale) => (
              <option key={locale.id} value={locale.id}>
                {locale.name}
              </option>
            ))}
          </select>

          <select
            value={ordinamento}
            onChange={(e) => setOrdinamento(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
          >
            <option value="data">Ordina per settimana</option>
            <option value="locale">Ordina per locale</option>
            <option value="prodotti">Ordina per numero prodotti</option>
            <option value="quantita">Ordina per quantità totale</option>
          </select>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">
            Caricamento storico ordini...
          </section>
        ) : (
          <section className="space-y-3">
            {gruppi.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  Nessun ordine trovato.
                </p>
              </div>
            )}

            {gruppi.map((gruppo: any) => {
              const aperto = gruppoAperto === gruppo.id

              return (
                <div
                  key={gruppo.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <button
                      onClick={() => setGruppoAperto(aperto ? null : gruppo.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <h3 className="truncate text-base font-bold text-slate-950 sm:text-lg">
                        {gruppo.locale} · {gruppo.settimana}
                      </h3>

                      <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                        Responsabile: {gruppo.responsabile} ·{" "}
                        {gruppo.prodotti.length} prodotti · Totale quantità:{" "}
                        {totaleGruppo(gruppo)}
                      </p>
                    </button>

                    <button
                      onClick={() => setGruppoAperto(aperto ? null : gruppo.id)}
                      className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                    >
                      {aperto ? "Chiudi" : "Apri"}
                    </button>
                  </div>

                  {aperto && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="hidden grid-cols-[1fr_120px_180px_180px] bg-slate-950 text-[11px] font-bold uppercase tracking-wide text-white md:grid">
                          <div className="px-3 py-2.5">Prodotto</div>
                          <div className="px-3 py-2.5">Quantità</div>
                          <div className="px-3 py-2.5">Misure</div>
                          <div className="px-3 py-2.5">Data invio</div>
                        </div>

                        {gruppo.prodotti.map((ordine: any, index: number) => (
                          <div
                            key={ordine.id}
                            className={`grid grid-cols-1 gap-2 border-b border-slate-100 px-3 py-3 last:border-b-0 md:grid-cols-[1fr_120px_180px_180px] md:items-center md:gap-0 ${
                              index % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }`}
                          >
                            <div className="truncate text-sm font-bold text-slate-950">
                              {ordine.nome_prodotto}
                            </div>

                            <div className="text-sm font-bold text-blue-700">
                              {ordine.quantita}
                            </div>

                            <div className="text-xs font-semibold text-slate-500">
                              {ordine.misure || "-"}
                            </div>

                            <div className="text-xs font-semibold text-slate-500">
                              {ordine.created_at
                                ? new Date(ordine.created_at).toLocaleString(
                                    "it-IT"
                                  )
                                : "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}