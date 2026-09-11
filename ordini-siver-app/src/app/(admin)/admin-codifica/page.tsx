"use client"

import { useEffect, useState } from "react"
import { PackagePlus, RefreshCw, Search } from "lucide-react"
import {
  caricaDaCodificare,
  codificaProdotto,
  type DaCodificare,
} from "@/services/codifica.service"

export default function AdminCodifica() {
  const [righe, setRighe] = useState<DaCodificare[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [errore, setErrore] = useState("")
  const [messaggio, setMessaggio] = useState("")
  const [ricerca, setRicerca] = useState("")

  useEffect(() => {
    void carica()
  }, [])

  async function carica() {
    setLoading(true)
    setErrore("")

    try {
      setRighe(await caricaDaCodificare())
    } catch (error) {
      setErrore(error instanceof Error ? error.message : "Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  async function codifica(riga: DaCodificare) {
    setSaving(riga.supplierCode)
    setMessaggio("")
    setErrore("")

    try {
      await codificaProdotto({
        supplierCode: riga.supplierCode,
        nomeProdotto: riga.nomeProdotto,
        prezzo: riga.prezzo,
      })

      setMessaggio(
        `${riga.nomeProdotto} aggiunto in anagrafica${riga.prezzo ? ` a ${riga.prezzo} €` : " senza prezzo"}.`,
      )

      await carica()
    } catch (error) {
      setErrore(error instanceof Error ? error.message : "Errore imprevisto")
    } finally {
      setSaving(null)
    }
  }

  const filtrate = righe.filter((riga) => {
    const testo = ricerca.toLowerCase().trim()
    if (!testo) return true

    return (
      riga.nomeProdotto.toLowerCase().includes(testo) ||
      riga.supplierCode.toLowerCase().includes(testo)
    )
  })

  const ricorrenti = righe.filter((r) => r.occorrenze > 1).length

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                Anagrafica
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                Prodotti da codificare
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Compaiono nelle fatture o negli inevasi ma non esistono in
                anagrafica. Finché restano qui, le loro righe non si abbinano
                agli ordini e finiscono fra la merce senza ordine.
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

          {righe.length > 0 && (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">
              {righe.length} codici da valutare, di cui {ricorrenti} ricorrono
              in più documenti: quelli comprati una volta sola probabilmente non
              vale la pena censirli.
            </p>
          )}
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
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca prodotto o codice..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm font-black text-slate-500">
              Caricamento...
            </div>
          ) : filtrate.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-slate-500">
              Nessun prodotto da codificare: tutti i codici dei documenti
              esistono in anagrafica.
            </div>
          ) : (
            filtrate.map((riga, indice) => (
              <div
                key={riga.supplierCode}
                className={`flex flex-col gap-3 border-b border-slate-100 p-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between ${
                  indice % 2 === 0 ? "bg-white" : "bg-slate-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-slate-500">
                    {riga.supplierCode}
                  </p>
                  <h2 className="text-sm font-black text-slate-950">
                    {riga.nomeProdotto}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {riga.occorrenze} document{riga.occorrenze === 1 ? "o" : "i"} ·{" "}
                    {riga.pezzi} pezzi ·{" "}
                    {riga.locali.length === 1
                      ? riga.locali[0]
                      : `${riga.locali.length} locali`}
                  </p>

                  {riga.soloInevasi && (
                    <span className="mt-1 inline-flex rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-800">
                      visto solo negli inevasi, non ancora fatturato
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[11px] font-black uppercase text-slate-400">
                      prezzo
                    </p>
                    <p className="text-sm font-black text-slate-950">
                      {riga.prezzo !== null ? `${riga.prezzo} €` : "—"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void codifica(riga)}
                    disabled={saving !== null}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
                  >
                    <PackagePlus className="h-4 w-4" />
                    {saving === riga.supplierCode ? "..." : "Aggiungi"}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
