"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import {
  allineaPrezzo,
  caricaAndamentoPrezzi,
  type AndamentoPrezzo,
} from "@/services/prezzi.service"

export default function AdminPrezzi() {
  const [righe, setRighe] = useState<AndamentoPrezzo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [errore, setErrore] = useState("")
  const [messaggio, setMessaggio] = useState("")
  const [ricerca, setRicerca] = useState("")
  const [soloScostamenti, setSoloScostamenti] = useState(true)
  const [aperto, setAperto] = useState<string | null>(null)

  useEffect(() => {
    void carica()
  }, [])

  async function carica() {
    setLoading(true)
    setErrore("")

    try {
      setRighe(await caricaAndamentoPrezzi())
    } catch (error) {
      setErrore(error instanceof Error ? error.message : "Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  async function allinea(riga: AndamentoPrezzo) {
    if (!riga.productId) return

    setSaving(riga.supplierCode)
    setMessaggio("")

    try {
      await allineaPrezzo({
        productId: riga.productId,
        prezzo: riga.ultimoPrezzo,
        prezzoPrecedente: riga.prezzoAnagrafica,
        documento: riga.storico[riga.storico.length - 1]?.documento ?? null,
      })

      setMessaggio(`${riga.nomeProdotto}: prezzo aggiornato a ${riga.ultimoPrezzo} €`)
      await carica()
    } catch (error) {
      setErrore(error instanceof Error ? error.message : "Errore imprevisto")
    } finally {
      setSaving(null)
    }
  }

  const filtrate = useMemo(() => {
    const testo = ricerca.toLowerCase().trim()

    return righe.filter((riga) => {
      if (soloScostamenti && Math.abs(riga.scostamento ?? 0) < 0.5) return false

      if (!testo) return true

      return (
        riga.nomeProdotto.toLowerCase().includes(testo) ||
        riga.supplierCode.toLowerCase().includes(testo)
      )
    })
  }, [righe, ricerca, soloScostamenti])

  const impattoTotale = righe.reduce((somma, r) => somma + (r.impatto ?? 0), 0)
  const inAumento = righe.filter((r) => (r.scostamento ?? 0) > 0.5).length
  const inCalo = righe.filter((r) => (r.scostamento ?? 0) < -0.5).length

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                Prezzi fornitore
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                Andamento prezzi
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Confronto fra il prezzo in anagrafica e l&apos;ultimo
                effettivamente fatturato. Si aggiorna da solo a ogni fattura
                caricata.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void carica()}
              disabled={loading}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700 disabled:bg-slate-400"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Riquadro label="Prodotti rincarati" valore={inAumento} tono="rosso" />
            <Riquadro label="Prodotti scesi" valore={inCalo} tono="verde" />
            <Riquadro
              label="Impatto sui volumi acquistati"
              valore={`${impattoTotale >= 0 ? "+" : ""}${impattoTotale.toFixed(2)} €`}
              tono={impattoTotale > 0 ? "rosso" : "verde"}
            />
          </div>
        </header>

        {messaggio && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            {messaggio}
          </div>
        )}

        {errore && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errore}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca prodotto o codice..."
                className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={() => setSoloScostamenti(!soloScostamenti)}
              className={`h-12 rounded-2xl border-2 px-5 text-sm font-black transition ${
                soloScostamenti
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {soloScostamenti ? "Solo con scostamento" : "Tutti i prodotti"}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm font-black text-slate-500">
              Caricamento...
            </div>
          ) : filtrate.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-slate-500">
              Nessuno scostamento fra anagrafica e fatture.
            </div>
          ) : (
            filtrate.map((riga, indice) => (
              <div
                key={riga.supplierCode}
                className={indice % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setAperto(aperto === riga.supplierCode ? null : riga.supplierCode)
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {aperto === riga.supplierCode ? (
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    )}

                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-500">
                        {riga.supplierCode}
                      </p>
                      <h2 className="truncate text-sm font-black text-slate-950">
                        {riga.nomeProdotto}
                      </h2>
                      <p className="text-xs font-bold text-slate-500">
                        {riga.pezzi} pezzi acquistati · ultima fattura{" "}
                        {riga.ultimaData}
                      </p>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right">
                      <p className="text-[11px] font-black uppercase text-slate-400">
                        anagrafica
                      </p>
                      <p className="text-sm font-black text-slate-600">
                        {riga.prezzoAnagrafica !== null
                          ? `${riga.prezzoAnagrafica} €`
                          : "non impostato"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] font-black uppercase text-slate-400">
                        fatturato
                      </p>
                      <p className="text-sm font-black text-slate-950">
                        {riga.ultimoPrezzo} €
                      </p>
                    </div>

                    {riga.scostamento !== null && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black ${
                          riga.scostamento > 0
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-green-200 bg-green-50 text-green-700"
                        }`}
                      >
                        {riga.scostamento > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {riga.scostamento > 0 ? "+" : ""}
                        {riga.scostamento.toFixed(1)}%
                        {riga.impatto !== null && Math.abs(riga.impatto) >= 0.01 && (
                          <span className="ml-1 font-bold">
                            ({riga.impatto > 0 ? "+" : ""}
                            {riga.impatto.toFixed(2)} €)
                          </span>
                        )}
                      </span>
                    )}

                    {riga.productId &&
                      riga.scostamento !== null &&
                      Math.abs(riga.scostamento) >= 0.5 && (
                        <button
                          type="button"
                          onClick={() => void allinea(riga)}
                          disabled={saving !== null}
                          className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
                        >
                          {saving === riga.supplierCode ? "..." : "Allinea"}
                        </button>
                      )}
                  </div>
                </div>

                {aperto === riga.supplierCode && (
                  <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
                    <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
                      Prezzi osservati nelle fatture
                    </p>

                    <div className="space-y-1">
                      {riga.storico.map((punto, i) => (
                        <div
                          key={`${punto.data}-${i}`}
                          className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm"
                        >
                          <span className="font-bold text-slate-500">
                            {punto.data}
                          </span>
                          <span className="font-black text-slate-950">
                            {punto.prezzo} €
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {punto.quantita} pezzi
                          </span>
                          {punto.documento && (
                            <span className="text-xs font-bold text-slate-400">
                              fattura {punto.documento}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

function Riquadro({
  label,
  valore,
  tono,
}: {
  label: string
  valore: string | number
  tono: "rosso" | "verde"
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-black ${
          tono === "rosso" ? "text-red-700" : "text-green-700"
        }`}
      >
        {valore}
      </p>
    </div>
  )
}
