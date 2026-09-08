"use client"

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  PackageCheck,
  RefreshCw,
} from "lucide-react"
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
    cambiaQuantita,
    confermaRiga,
    confermaTutte,
    ricarica,
  } = useLocaleRicezione()

  function classeStato(riga: RigaRicezione) {
    if (!riga.validataIl) return "border-slate-200 bg-slate-100 text-slate-700"
    if (riga.quantitaConsegnata >= riga.quantitaOrdinata)
      return "border-green-200 bg-green-50 text-green-700"
    if (riga.quantitaConsegnata <= 0)
      return "border-red-200 bg-red-50 text-red-700"
    return "border-orange-200 bg-orange-50 text-orange-700"
  }

  function etichettaStato(riga: RigaRicezione) {
    if (!riga.validataIl) return "Da validare"
    if (riga.quantitaConsegnata >= riga.quantitaOrdinata) return "Completo"
    if (riga.quantitaConsegnata <= 0) return "Non arrivato"
    return "Parziale"
  }

  function proposta(riga: RigaRicezione) {
    if (riga.daFattura !== null) return `fattura: ${riga.daFattura}`
    if (riga.daInevaso !== null) return `inevaso: mancano ${riga.daInevaso}`
    return "nessun documento"
  }

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
                Cosa è arrivato davvero
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {localeNome || "Locale"} · controlla le quantità e conferma
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
                      {documento.fileName}
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
          <Riquadro label="Righe ordine" valore={totali.righe} />
          <Riquadro label="Validate" valore={totali.validate} />
          <Riquadro
            label="Con differenza"
            valore={totali.conDifferenza}
            allarme={totali.conDifferenza > 0}
          />
          <Riquadro
            label="Senza documento"
            valore={totali.senzaDocumento}
            allarme={totali.senzaDocumento > 0}
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
                Nessun ordine da ricevere per questa settimana.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden bg-slate-950 text-[11px] font-black uppercase tracking-wide text-white md:grid md:grid-cols-[1.4fr_120px_180px_160px_150px_140px]">
                <div className="px-4 py-3">Prodotto</div>
                <div className="px-4 py-3 text-center">Ordinati</div>
                <div className="px-4 py-3 text-center">Dai documenti</div>
                <div className="px-4 py-3 text-center">Arrivati</div>
                <div className="px-4 py-3 text-center">Stato</div>
                <div className="px-4 py-3 text-right">Conferma</div>
              </div>

              {righe.map((riga, indice) => (
                <div
                  key={riga.ordineId}
                  className={`grid grid-cols-1 gap-2 border-b border-slate-100 p-3 last:border-b-0 md:grid-cols-[1.4fr_120px_180px_160px_150px_140px] md:items-center md:gap-0 md:p-0 ${
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
                  </div>

                  <div className="text-sm font-black text-slate-700 md:px-4 md:py-3 md:text-center">
                    <span className="md:hidden">Ordinati: </span>
                    {riga.quantitaOrdinata}
                  </div>

                  <div className="text-xs font-bold text-slate-500 md:px-4 md:py-3 md:text-center">
                    {proposta(riga)}
                  </div>

                  <div className="md:px-4 md:py-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={riga.quantitaConsegnata}
                      onChange={(e) =>
                        cambiaQuantita(riga.ordineId, e.target.value)
                      }
                      className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-center text-lg font-black text-slate-950 outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="md:px-4 md:py-3 md:text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase ${classeStato(riga)}`}
                    >
                      {etichettaStato(riga)}
                    </span>

                    {riga.validataDa && (
                      <p className="mt-1 text-[11px] font-bold text-slate-400">
                        {riga.validataDa}
                      </p>
                    )}
                  </div>

                  <div className="md:px-4 md:py-3 md:text-right">
                    <button
                      type="button"
                      onClick={() => void confermaRiga(riga)}
                      disabled={inSalvataggio !== null}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-300 md:w-auto"
                    >
                      {inSalvataggio === riga.ordineId ? (
                        "..."
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Conferma
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
                  Righe nei documenti senza ordine corrispondente
                </p>
                <p className="text-xs font-bold text-amber-800">
                  Merce non ordinata, oppure codice non riconosciuto. Segnalale
                  all&apos;amministrazione.
                </p>
              </div>
            </div>

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
              Righe validate
            </p>
            <p className="text-xl font-black">
              {totali.validate} / {totali.righe}
            </p>
            <p className="text-[11px] font-bold text-slate-400">
              stai validando come {operatore}
            </p>
          </div>

          <button
            onClick={() => void confermaTutte()}
            disabled={inSalvataggio !== null || loading || righe.length === 0}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-base font-black text-white transition-all hover:bg-blue-700 disabled:bg-slate-500"
          >
            {inSalvataggio === "tutte" ? (
              "Validazione..."
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Conferma tutte le righe rimaste
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}

function Riquadro({
  label,
  valore,
  allarme,
}: {
  label: string
  valore: number
  allarme?: boolean
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-3xl font-black tracking-tight ${
          allarme ? "text-amber-600" : "text-slate-950"
        }`}
      >
        {valore}
      </p>
    </div>
  )
}
