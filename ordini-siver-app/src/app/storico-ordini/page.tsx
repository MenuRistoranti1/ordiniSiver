"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"

export default function StoricoOrdini() {
  const { showToast } = useToast()

  const [ordini, setOrdini] = useState<any[]>([])
  const [localeNome, setLocaleNome] = useState("")
  const [loading, setLoading] = useState(true)
  const [ricerca, setRicerca] = useState("")
  const [gruppoAperto, setGruppoAperto] = useState<string | null>(null)
  const [ordinamento, setOrdinamento] = useState("data")

  useEffect(() => {
    const localeId = localStorage.getItem("locale_id") || ""
    const nome = localStorage.getItem("locale_nome") || ""

    if (!localeId) {
      window.location.href = "/"
      return
    }

    setLocaleNome(nome)
    caricaOrdini(localeId)
  }, [])

  async function caricaOrdini(localeId: string) {
    setLoading(true)

    const { data, error } = await supabase
      .from("ordini")
      .select("*")
      .eq("locale_id", String(localeId))
      .order("created_at", { ascending: false })

    if (error) {
      console.log("Errore storico ordini:", error)
      showToast("Errore caricamento storico ordini", "error")
      setLoading(false)
      return
    }

    setOrdini(data || [])
    setLoading(false)
  }

  function logout() {
    localStorage.clear()
    window.location.href = "/"
  }

  const gruppi = useMemo(() => {
    const gruppati = Object.values(
      ordini.reduce((acc: any, ordine: any) => {
        const settimana =
          ordine.settimana_key || ordine.created_at?.split("T")[0] || "-"

        const responsabile = ordine.responsabile || "Senza responsabile"
        const chiave = `${settimana}-${responsabile}`

        if (!acc[chiave]) {
          acc[chiave] = {
            id: chiave,
            settimana,
            responsabile,
            created_at: ordine.created_at,
            prodotti: [],
          }
        }

        acc[chiave].prodotti.push(ordine)
        return acc
      }, {})
    ) as any[]

    return gruppati.sort((a, b) => {
      if (ordinamento === "prodotti") {
        return b.prodotti.length - a.prodotti.length
      }

      if (ordinamento === "quantita") {
        return totaleGruppo(b) - totaleGruppo(a)
      }

      return String(b.settimana).localeCompare(String(a.settimana))
    })
  }, [ordini, ordinamento])

  const gruppiFiltrati = useMemo(() => {
    const q = ricerca.toLowerCase().trim()

    if (!q) return gruppi

    return gruppi
      .map((gruppo: any) => {
        const testoGruppo =
          `${gruppo.settimana} ${gruppo.responsabile}`.toLowerCase()

        const prodottiFiltrati = gruppo.prodotti.filter((ordine: any) =>
          [
            ordine.nome_prodotto,
            ordine.responsabile,
            ordine.settimana_key,
            ordine.misure,
            ordine.locale_nome,
          ]
            .filter(Boolean)
            .some((valore) => String(valore).toLowerCase().includes(q))
        )

        if (testoGruppo.includes(q)) {
          return gruppo
        }

        return {
          ...gruppo,
          prodotti: prodottiFiltrati,
        }
      })
      .filter((gruppo: any) => gruppo.prodotti.length > 0)
  }, [gruppi, ricerca])

  const totaleQuantita = useMemo(() => {
    return ordini.reduce(
      (sum, ordine) => sum + Number(ordine.quantita || 0),
      0
    )
  }, [ordini])

  function totaleGruppo(gruppo: any) {
    return gruppo.prodotti.reduce(
      (sum: number, ordine: any) => sum + Number(ordine.quantita || 0),
      0
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-4">

        <section className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                OrdiniSiver
              </h1>

              <p className="mt-0.5 text-xs font-medium text-slate-300">
                Storico ordini · {localeNome}
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
              onClick={() => (window.location.href = "/dashboard")}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Home
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
          <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Storico ordini
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            Consulta gli ordini inviati dal locale, raggruppati per settimana.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Ordini
            </p>

            <p className="mt-1 text-3xl font-black text-slate-950">
              {gruppiFiltrati.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Righe prodotto
            </p>

            <p className="mt-1 text-3xl font-black text-slate-950">
              {ordini.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Quantità totali
            </p>

            <p className="mt-1 text-3xl font-black text-slate-950">
              {totaleQuantita}
            </p>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-[1fr_240px]">

          <input
            type="text"
            placeholder="Cerca prodotto, responsabile, settimana..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 placeholder:text-slate-500 shadow-sm outline-none focus:border-blue-600"
          />

          <select
            value={ordinamento}
            onChange={(e) => setOrdinamento(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 shadow-sm outline-none focus:border-blue-600"
          >
            <option value="data">Ordina per settimana</option>
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

            {gruppiFiltrati.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-600">
                  Nessun ordine trovato.
                </p>
              </div>
            )}

            {gruppiFiltrati.map((gruppo: any) => {
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
                      <h3 className="truncate text-lg font-black text-slate-950">
                        Ordine · {gruppo.settimana}
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        Responsabile: {gruppo.responsabile}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {gruppo.prodotti.length} prodotti · Totale quantità:{" "}
                        {totaleGruppo(gruppo)}
                      </p>
                    </button>

                    <button
                      onClick={() => setGruppoAperto(aperto ? null : gruppo.id)}
                      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                    >
                      {aperto ? "Chiudi" : "Apri"}
                    </button>
                  </div>

                  {aperto && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">

                      <div className="space-y-3">

                        {gruppo.prodotti.map((ordine: any, index: number) => (
                          <div
                            key={ordine.id}
                            className={`rounded-2xl border border-slate-200 p-4 ${
                              index % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">

                              <div className="min-w-0 flex-1">

                                <h4 className="text-base font-black text-slate-950">
                                  {ordine.nome_prodotto}
                                </h4>

                                <div className="mt-3 flex flex-wrap gap-2">

                                  <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                                    Quantità: {ordine.quantita}
                                  </span>

                                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                    Misure: {ordine.misure || "-"}
                                  </span>

                                </div>

                                <p className="mt-3 text-xs font-semibold text-slate-500">
                                  {ordine.created_at
                                    ? new Date(
                                        ordine.created_at
                                      ).toLocaleString("it-IT")
                                    : "-"}
                                </p>

                              </div>

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