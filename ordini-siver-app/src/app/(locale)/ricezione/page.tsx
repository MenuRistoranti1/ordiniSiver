"use client"

import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  PackageCheck,
  RefreshCw,
  Send,
} from "lucide-react"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"
import { useLocaleRicezione } from "@/hooks/useLocaleRicezione"
import type { RigaRicezione } from "@/types/ricezione"

export default function Ricezione() {
  const {
    localeNome,
    operatore,
    loading,
    inSalvataggio,
    righe,
    senzaOrdine,
    documenti,
    totali,
    segnalazioneInviata,
    cambiaQuantita,
    confermaRiga,
    confermaTutte,
    segnalaAdmin,
    ricarica,
  } = useLocaleRicezione()

  const [confermaAperta, setConfermaAperta] = useState(false)

  function dataOrdine(riga: RigaRicezione) {
    if (!riga.settimanaOrdine) return "—"

    return new Date(riga.settimanaOrdine).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
    })
  }

  const daRegistrare = righe.filter((riga) => riga.inArrivo > 0).length

  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-32 pt-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <LocaleMobileHeader />

        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                Ricezione merce
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Cosa deve ancora arrivare
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {localeNome || "Locale"} · registra le quantità consegnate
              </p>
            </div>

            <button
              type="button"
              onClick={() => void ricarica()}
              disabled={loading}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-black text-white transition-all hover:bg-blue-700 disabled:bg-slate-400"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>
          </div>
        </header>

        {documenti.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
              Documenti del fornitore
            </p>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {documenti.map((documento) => (
                <div
                  key={documento.id}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {documento.numeroDocumento || documento.fileName}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      {documento.tipo} · {documento.righeAbbinate} di{" "}
                      {documento.righeTotali} righe abbinate
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Riquadro label="Righe aperte" valore={totali.righe} />
          <Riquadro label="Pezzi da ricevere" valore={totali.daRicevere} />
          <Riquadro
            label="Con consegna proposta"
            valore={totali.conProposta}
            evidenzia={totali.conProposta > 0}
          />
          <Riquadro
            label="In attesa da 2+ settimane"
            valore={totali.inRitardo}
            allarme={totali.inRitardo > 0}
          />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm font-black text-slate-500">
              Caricamento ricezione...
            </div>
          ) : righe.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <PackageCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">
                Nessun ordine in attesa di consegna.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden bg-slate-950 text-[11px] font-black uppercase tracking-wide text-white md:grid md:grid-cols-[1.5fr_110px_130px_150px_150px_130px]">
                <div className="px-4 py-3">Prodotto</div>
                <div className="px-4 py-3 text-center">Ordine</div>
                <div className="px-4 py-3 text-center">Ordinati</div>
                <div className="px-4 py-3 text-center">Già ricevuti</div>
                <div className="px-4 py-3 text-center">Arrivati ora</div>
                <div className="px-4 py-3 text-right">Registra</div>
              </div>

              {righe.map((riga, indice) => (
                <div
                  key={riga.ordineId}
                  className={`grid grid-cols-1 gap-2 border-b border-slate-100 p-3 last:border-b-0 md:grid-cols-[1.5fr_110px_130px_150px_150px_130px] md:items-center md:gap-0 md:p-0 ${
                    indice % 2 === 0 ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  <div className="min-w-0 md:px-4 md:py-3">
                    <p className="text-xs font-black text-slate-500">
                      {riga.supplierCode || "senza codice"}
                    </p>
                    <h3 className="truncate text-sm font-black text-slate-950">
                      {riga.nomeProdotto}
                    </h3>

                    {riga.settimaneDiAttesa >= 2 && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                        <Clock className="h-3 w-3" />
                        in attesa da {riga.settimaneDiAttesa} settimane
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-500 md:px-4 md:py-3 md:text-center">
                    {dataOrdine(riga)}
                  </div>

                  <div className="text-sm font-black text-slate-700 md:px-4 md:py-3 md:text-center">
                    <span className="md:hidden">Ordinati: </span>
                    {riga.quantitaOrdinata}
                  </div>

                  <div className="text-sm font-bold text-slate-500 md:px-4 md:py-3 md:text-center">
                    <span className="md:hidden">Già ricevuti: </span>
                    {riga.giaRicevuta}
                    <span className="text-xs"> · mancano {riga.residuo}</span>
                  </div>

                  <div className="md:px-4 md:py-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={riga.inArrivo}
                      onChange={(e) =>
                        cambiaQuantita(riga.ordineId, e.target.value)
                      }
                      className={`h-12 w-full rounded-xl border-2 px-3 text-center text-lg font-black text-slate-950 outline-none focus:border-blue-600 ${
                        riga.propostaDaDocumenti > 0
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    />

                    {riga.propostaDaDocumenti > 0 && (
                      <p className="mt-1 text-center text-[10px] font-black uppercase text-blue-600">
                        da fattura
                      </p>
                    )}
                  </div>

                  <div className="md:px-4 md:py-3 md:text-right">
                    <button
                      type="button"
                      onClick={() => void confermaRiga(riga)}
                      disabled={inSalvataggio !== null || riga.inArrivo <= 0}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 md:w-auto"
                    >
                      {inSalvataggio === riga.ordineId ? (
                        "..."
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Registra
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

        {senzaOrdine.length > 0 && (
          <section className="rounded-3xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <div className="mb-3 flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-black text-amber-900">
                  Merce arrivata senza essere stata ordinata
                </p>
                <p className="text-xs font-bold text-amber-800">
                  Nessun ordine aperto con questo codice, nemmeno delle
                  settimane precedenti.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void segnalaAdmin()}
              disabled={inSalvataggio !== null || segnalazioneInviata}
              className="mb-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 text-sm font-black text-white transition hover:bg-amber-700 disabled:bg-amber-300 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              {segnalazioneInviata
                ? "Segnalazione inviata"
                : inSalvataggio === "segnalazione"
                  ? "Invio in corso..."
                  : "Segnala all'amministrazione"}
            </button>

            <div className="space-y-2">
              {senzaOrdine.map((riga) => (
                <div
                  key={riga.documentRowId}
                  className="rounded-2xl border border-amber-200 bg-white p-3"
                >
                  <p className="text-xs font-black text-slate-500">
                    {riga.supplierCode || "senza codice"} · {riga.tipoDocumento}
                  </p>
                  <p className="text-sm font-black text-slate-950">
                    {riga.nomeProdotto}
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    quantità {riga.quantita} · {riga.documentoNome}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase text-slate-400">
              Righe da registrare
            </p>
            <p className="text-xl font-black">
              {daRegistrare} / {totali.righe}
            </p>
            <p className="text-[11px] font-bold text-slate-400">
              registri come {operatore}
            </p>
          </div>

          <button
            onClick={() => setConfermaAperta(true)}
            disabled={inSalvataggio !== null || loading || daRegistrare === 0}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-base font-black text-white transition-all hover:bg-blue-700 disabled:bg-slate-500"
          >
            {inSalvataggio === "tutte" ? (
              "Registrazione..."
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Registra tutte le consegne
              </>
            )}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confermaAperta}
        title="Registrare le consegne?"
        description={`Stai registrando la merce arrivata su ${daRegistrare} righe. Le quantità si sommano a quelle già ricevute e non saranno più modificabili: le righe che restano scoperte continueranno a comparire finché non arriva il resto.`}
        confirmText="Registra"
        cancelText="Continua a controllare"
        loading={inSalvataggio === "tutte"}
        onCancel={() => setConfermaAperta(false)}
        onConfirm={async () => {
          setConfermaAperta(false)
          await confermaTutte()
        }}
      />
    </main>
  )
}

function Riquadro({
  label,
  valore,
  allarme,
  evidenzia,
}: {
  label: string
  valore: number
  allarme?: boolean
  evidenzia?: boolean
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-3xl font-black tracking-tight ${
          allarme
            ? "text-amber-600"
            : evidenzia
              ? "text-blue-600"
              : "text-slate-950"
        }`}
      >
        {valore}
      </p>
    </div>
  )
}
