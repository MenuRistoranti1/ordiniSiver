"use client"

import { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Clock,
  PackageCheck,
  RefreshCw,
  Unlock,
} from "lucide-react"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { settimanaKeyCorrente } from "@/lib/settimana"
import {
  caricaDettaglioLocale,
  caricaStatoRicezioni,
  riapriRicezione,
  type StatoRicezioneLocale,
} from "@/services/ricezioni-admin.service"
import type { Ricezione } from "@/types/ricezione"

export default function AdminRicezioni() {
  const [stati, setStati] = useState<StatoRicezioneLocale[]>([])
  const [aperto, setAperto] = useState<string | null>(null)
  const [dettaglio, setDettaglio] = useState<Ricezione | null>(null)
  const [caricandoDettaglio, setCaricandoDettaglio] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState("")
  const [messaggio, setMessaggio] = useState("")
  const [daRiaprire, setDaRiaprire] = useState<StatoRicezioneLocale | null>(null)

  useEffect(() => {
    void carica()
  }, [])

  async function carica() {
    setLoading(true)
    setErrore("")

    try {
      setStati(await caricaStatoRicezioni())
    } catch (error) {
      setErrore(error instanceof Error ? error.message : "Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  async function apri(stato: StatoRicezioneLocale) {
    if (aperto === stato.localeId) {
      setAperto(null)
      setDettaglio(null)
      return
    }

    setAperto(stato.localeId)
    setDettaglio(null)
    setCaricandoDettaglio(true)

    try {
      setDettaglio(await caricaDettaglioLocale(stato.localeId))
    } catch (error) {
      setErrore(error instanceof Error ? error.message : "Errore imprevisto")
    } finally {
      setCaricandoDettaglio(false)
    }
  }

  async function confermaRiapertura() {
    if (!daRiaprire) return

    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      await riapriRicezione({
        localeId: daRiaprire.localeId,
        localeNome: daRiaprire.localeNome,
        settimanaKey: settimanaKeyCorrente(),
      })

      setMessaggio(
        `Ricezione di ${daRiaprire.localeNome} riaperta: il locale è stato avvisato e può correggere le quantità.`,
      )

      setDaRiaprire(null)
      await carica()
    } catch (error) {
      setErrore(error instanceof Error ? error.message : "Errore imprevisto")
    } finally {
      setSaving(false)
    }
  }

  const totaleArretrato = stati.reduce((somma, s) => somma + s.pezziArretrati, 0)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                Ricezione merce
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                Cosa non è ancora arrivato
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Apri un locale per il dettaglio. In rosso ciò che nessuna
                fattura copre: ordinato nelle settimane passate e mai arrivato.
                In blu ciò che è arrivato e attende solo la registrazione.
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

          {totaleArretrato > 0 && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-900">
              {totaleArretrato} pezzi ordinati nelle settimane passate non
              risultano in nessuna fattura: è l&apos;arretrato da contestare al
              fornitore.
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

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm font-black text-slate-500">
              Caricamento...
            </div>
          ) : stati.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-slate-500">
              Nessun ordine registrato.
            </div>
          ) : (
            stati.map((stato, indice) => (
              <div
                key={stato.localeId}
                className={indice % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => void apri(stato)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {aperto === stato.localeId ? (
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    )}

                    <div className="min-w-0">
                      <h2 className="text-base font-black text-slate-950">
                        {stato.localeNome}
                      </h2>
                      <p className="text-sm font-bold text-slate-500">
                        {stato.righeAperte} righe aperte
                        {stato.daRegistrare > 0
                          ? ` · ${stato.pezziDaRegistrare} pezzi già in fattura da registrare`
                          : ""}
                        {stato.validataDa ? ` · ultima validazione ${stato.validataDa}` : ""}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    {stato.arretrato > 0 ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black uppercase text-red-700">
                        <Clock className="h-4 w-4" />
                        mai arrivati: {stato.pezziArretrati} pezzi
                      </span>
                    ) : stato.daRegistrare > 0 ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase text-blue-700">
                        <PackageCheck className="h-4 w-4" />
                        consegnati, da registrare
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] font-black uppercase text-green-700">
                        <PackageCheck className="h-4 w-4" />
                        nessun arretrato
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setDaRiaprire(stato)}
                      disabled={saving || !stato.ultimaValidazione}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      <Unlock className="h-4 w-4" />
                      Riapri
                    </button>
                  </div>
                </div>

                {aperto === stato.localeId && (
                  <div className="border-b border-slate-200 bg-slate-100 px-4 py-4">
                    {caricandoDettaglio ? (
                      <p className="text-sm font-bold text-slate-500">
                        Caricamento dettaglio...
                      </p>
                    ) : !dettaglio || dettaglio.righe.length === 0 ? (
                      <p className="text-sm font-bold text-slate-500">
                        Nessuna riga aperta per questo locale.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                          <thead className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="pb-2 pr-3">Prodotto</th>
                              <th className="pb-2 pr-3">Settimana</th>
                              <th className="pb-2 pr-3 text-center">Ordinati</th>
                              <th className="pb-2 pr-3 text-center">Ricevuti</th>
                              <th className="pb-2 pr-3 text-center">Mancano</th>
                              <th className="pb-2 text-center">In attesa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dettaglio.righe.map((riga) => (
                              <tr
                                key={riga.ordineId}
                                className="border-t border-slate-200"
                              >
                                <td className="py-2 pr-3">
                                  <p className="text-[11px] font-black text-slate-500">
                                    {riga.supplierCode || "senza codice"}
                                  </p>
                                  <p className="font-black text-slate-950">
                                    {riga.nomeProdotto}
                                  </p>
                                </td>
                                <td className="py-2 pr-3 font-bold text-slate-600">
                                  {riga.settimanaOrdine}
                                </td>
                                <td className="py-2 pr-3 text-center font-black text-slate-700">
                                  {riga.quantitaOrdinata}
                                </td>
                                <td className="py-2 pr-3 text-center font-bold text-slate-600">
                                  {riga.giaRicevuta}
                                </td>
                                <td className="py-2 pr-3 text-center font-black text-slate-950">
                                  {riga.residuo}
                                  {riga.propostaDaDocumenti > 0 && (
                                    <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">
                                      {riga.propostaDaDocumenti} in fattura
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 text-center">
                                  {riga.settimaneDiAttesa >= 1 ? (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">
                                      {riga.settimaneDiAttesa} sett.
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-bold text-slate-400">
                                      ordine di questa settimana
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {dettaglio.senzaOrdine.length > 0 && (
                          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                            {dettaglio.senzaOrdine.length} righe nei documenti
                            senza ordine corrispondente: merce arrivata e mai
                            ordinata, oppure ordini non registrati.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>

      <ConfirmDialog
        open={!!daRiaprire}
        title="Riaprire la ricezione?"
        description={`${daRiaprire?.localeNome || "Il locale"} potrà di nuovo modificare le quantità ricevute della settimana corrente. I numeri già inseriti restano, viene tolta solo la chiusura, e il locale riceve una notifica.`}
        confirmText="Riapri"
        cancelText="Annulla"
        loading={saving}
        onCancel={() => setDaRiaprire(null)}
        onConfirm={confermaRiapertura}
      />
    </div>
  )
}
