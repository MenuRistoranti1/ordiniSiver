"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Clock, RefreshCw, Unlock } from "lucide-react"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { settimanaKeyCorrente } from "@/lib/settimana"
import {
  caricaStatoRicezioni,
  riapriRicezione,
  type StatoRicezioneLocale,
} from "@/services/ricezioni-admin.service"

export default function AdminRicezioni() {
  const [settimanaKey, setSettimanaKey] = useState(settimanaKeyCorrente())
  const [stati, setStati] = useState<StatoRicezioneLocale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState("")
  const [messaggio, setMessaggio] = useState("")
  const [daRiaprire, setDaRiaprire] = useState<StatoRicezioneLocale | null>(
    null,
  )

  useEffect(() => {
    void carica()
  }, [settimanaKey])

  async function carica() {
    setLoading(true)
    setErrore("")

    try {
      setStati(await caricaStatoRicezioni(settimanaKey))
    } catch (error) {
      setErrore(error instanceof Error ? error.message : "Errore imprevisto")
    } finally {
      setLoading(false)
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
        settimanaKey,
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
                Stato validazioni per locale
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Chi ha già confermato cosa è arrivato, e chi deve ancora farlo.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-black uppercase text-slate-500">
                Settimana
                <input
                  type="date"
                  value={settimanaKey}
                  onChange={(e) => setSettimanaKey(e.target.value)}
                  className="mt-1 block h-12 rounded-2xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
                />
              </label>

              <button
                type="button"
                onClick={() => void carica()}
                disabled={loading}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700 disabled:bg-slate-400"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Aggiorna
              </button>
            </div>
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

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm font-black text-slate-500">
              Caricamento...
            </div>
          ) : stati.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-slate-500">
              Nessun ordine registrato per questa settimana.
            </div>
          ) : (
            stati.map((stato, indice) => (
              <div
                key={stato.localeId}
                className={`flex flex-col gap-3 border-b border-slate-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between ${
                  indice % 2 === 0 ? "bg-white" : "bg-slate-50"
                }`}
              >
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-950">
                    {stato.localeNome}
                  </h2>
                  <p className="text-sm font-bold text-slate-500">
                    {stato.validate} di {stato.righe} righe validate
                    {stato.validataDa ? ` · ${stato.validataDa}` : ""}
                    {stato.ultimaValidazione
                      ? ` · ${new Date(stato.ultimaValidazione).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase ${
                      stato.chiusa
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {stato.chiusa ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    {stato.chiusa ? "Chiusa" : "In corso"}
                  </span>

                  <button
                    type="button"
                    onClick={() => setDaRiaprire(stato)}
                    disabled={!stato.chiusa || saving}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <Unlock className="h-4 w-4" />
                    Riapri
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <ConfirmDialog
        open={!!daRiaprire}
        title="Riaprire la ricezione?"
        description={`${daRiaprire?.localeNome || "Il locale"} potrà di nuovo modificare le quantità ricevute della settimana ${settimanaKey}. I numeri già inseriti restano, viene tolta solo la chiusura, e il locale riceve una notifica.`}
        confirmText="Riapri"
        cancelText="Annulla"
        loading={saving}
        onCancel={() => setDaRiaprire(null)}
        onConfirm={confermaRiapertura}
      />
    </div>
  )
}
