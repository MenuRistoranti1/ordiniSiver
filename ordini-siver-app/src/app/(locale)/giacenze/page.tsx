"use client"

import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Home,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  User,
  Warehouse,
} from "lucide-react"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"
import { useLocaleInventory } from "@/hooks/useLocaleInventory"
import type {
  InventoryFilter,
  InventoryProduct,
  InventorySort,
  InventoryStatus,
} from "@/types/inventory"

export default function Giacenze() {
  const {
    localeNome,
    operatore,
    blocco,
    loading,
    isSaving,
    isDraftSaving,
    ultimaModifica,
    ultimaBozza,
    quantita,
    prodottiFiltrati,
    prodottiTotali,
    prodottiCompilati,
    quantitaTotaleCompilata,
    prodottiSottoSoglia,
    percentualeCompilazione,
    ricerca,
    setRicerca,
    filtro,
    setFiltro,
    ordinamento,
    setOrdinamento,
    soloDaCompilare,
    setSoloDaCompilare,
    statoSoglia,
    prodottoCompilato,
    aggiornaQuantita,
    cambiaQuantita,
    aggiornaPagina,
    salvaBozza,
    inviaGiacenze,
    salutoOrario,
    periodoSettimana,
  } = useLocaleInventory()

  function classeStato(stato: InventoryStatus) {
    if (stato === "Sotto soglia") return "border-red-200 bg-red-50 text-red-700"
    if (stato === "Sopra soglia") return "border-orange-200 bg-orange-50 text-orange-700"
    if (stato === "Corretto") return "border-green-200 bg-green-50 text-green-700"
    return "border-slate-200 bg-slate-100 text-slate-700"
  }

  function renderQuantitaControl(prodotto: InventoryProduct) {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => cambiaQuantita(prodotto.id, -1)}
          disabled={!!blocco || isSaving}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm transition-all hover:bg-blue-50 disabled:bg-slate-100 disabled:text-slate-300"
          aria-label={`Diminuisci quantità ${prodotto.nome_prodotto}`}
        >
          <Minus className="h-5 w-5" />
        </button>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={quantita[prodotto.id] || ""}
          disabled={!!blocco || isSaving}
          onChange={(e) => aggiornaQuantita(prodotto.id, e.target.value)}
          className="h-11 w-28 rounded-xl border-2 border-slate-200 bg-white px-3 text-center text-lg font-black text-slate-950 outline-none transition-all focus:border-blue-600 disabled:bg-slate-200 disabled:text-slate-500"
          placeholder="0"
        />

        <button
          type="button"
          onClick={() => cambiaQuantita(prodotto.id, 1)}
          disabled={!!blocco || isSaving}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 disabled:bg-slate-300"
          aria-label={`Aumenta quantità ${prodotto.nome_prodotto}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    )
  }

  function KpiCard({
    label,
    value,
    note,
    icon: Icon,
    tone,
  }: {
    label: string
    value: string | number
    note: string
    icon: LucideIcon
    tone: string
  }) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
            <Icon className="h-7 w-7" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p>
            <p className="text-sm font-bold text-slate-500">{note}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-32 pt-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <LocaleMobileHeader />

        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">Giacenze settimana</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {salutoOrario()} {operatore}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
                <span>{localeNome || "Locale"}</span>
                <span>·</span>
                <span>Inserisci le quantità disponibili</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[560px]">
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard")}
                disabled={isSaving}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition-all hover:bg-slate-800 disabled:bg-slate-400"
              >
                <Home className="h-5 w-5" />
                Home
              </button>

              <button
                type="button"
                onClick={aggiornaPagina}
                disabled={loading || isSaving}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition-all hover:bg-blue-700 disabled:bg-slate-400"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                Aggiorna
              </button>

              <div className="rounded-2xl bg-blue-50 p-3">
                <p className="text-[11px] font-black uppercase text-blue-600">Settimana</p>
                <p className="mt-1 text-sm font-black text-blue-900">{periodoSettimana()}</p>
              </div>
            </div>
          </div>
        </header>

        {blocco && (
          <section className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm font-black text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{blocco}</span>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Avanzamento compilazione</p>
                  <p className="mt-1 text-3xl font-black text-slate-950">{percentualeCompilazione}%</p>
                </div>
                <p className="text-sm font-black text-slate-500">
                  {prodottiCompilati} di {prodottiTotali} prodotti
                </p>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${percentualeCompilazione}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 lg:w-72">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="truncate">{operatore}</span>
              </div>
              <p className="mt-1 text-xs font-black text-slate-400">
                {ultimaBozza
                  ? `Bozza salvata alle ${new Date(ultimaBozza).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`
                  : "Nessuna bozza salvata"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Prodotti totali"
            value={prodottiTotali}
            note="prodotti attivi"
            icon={Package}
            tone="bg-blue-100 text-blue-700"
          />
          <KpiCard
            label="Compilati"
            value={prodottiCompilati}
            note="prodotti inseriti"
            icon={ClipboardCheck}
            tone="bg-green-100 text-green-700"
          />
          <KpiCard
            label="Quantità totale"
            value={quantitaTotaleCompilata}
            note="pezzi complessivi"
            icon={Warehouse}
            tone="bg-purple-100 text-purple-700"
          />
          <KpiCard
            label="Sotto soglia"
            value={prodottiSottoSoglia}
            note="prodotti da verificare"
            icon={AlertTriangle}
            tone={prodottiSottoSoglia > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_220px_220px_170px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca prodotto o codice..."
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
              />
            </div>

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as InventoryFilter)}
              className="h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
            >
              <option value="tutti">Tutti i prodotti</option>
              <option value="compilati">Solo compilati</option>
              <option value="Sotto soglia">Sotto soglia</option>
              <option value="Corretto">Corretto</option>
              <option value="Sopra soglia">Sopra soglia</option>
              <option value="Da compilare">Da compilare</option>
            </select>

            <select
              value={ordinamento}
              onChange={(e) => setOrdinamento(e.target.value as InventorySort)}
              className="h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
            >
              <option value="nome">Ordina per nome</option>
              <option value="codice">Ordina per codice</option>
              <option value="min">Ordina per minimo</option>
              <option value="max">Ordina per massimo</option>
              <option value="stato">Ordina per stato</option>
            </select>

            <button
              type="button"
              onClick={() => setSoloDaCompilare(!soloDaCompilare)}
              className={`inline-flex h-14 items-center justify-center rounded-2xl border-2 px-4 text-sm font-black transition-all ${
                soloDaCompilare
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-100 bg-blue-50 text-blue-700"
              }`}
            >
              {soloDaCompilare ? "Solo da compilare attivo" : "Solo da compilare"}
            </button>

            <button
              type="button"
              onClick={aggiornaPagina}
              disabled={loading || isSaving}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:bg-slate-400"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm font-black text-slate-500">
              Caricamento prodotti...
            </div>
          ) : (
            <>
              <div className="hidden bg-slate-950 text-[11px] font-black uppercase tracking-wide text-white md:grid md:grid-cols-[1.2fr_150px_160px_160px_230px]">
                <div className="px-4 py-3">Prodotto</div>
                <div className="px-4 py-3 text-center">Attuale</div>
                <div className="px-4 py-3 text-center">Range</div>
                <div className="px-4 py-3 text-center">Stato</div>
                <div className="px-4 py-3 text-right">Giacenza</div>
              </div>

              <div className="hidden md:block">
                {prodottiFiltrati.map((prodotto, index) => {
                  const stato = statoSoglia(prodotto)
                  const valore = quantita[prodotto.id]
                  const modificata = ultimaModifica === prodotto.id

                  return (
                    <div
                      key={prodotto.id}
                      className={`grid grid-cols-[1.2fr_150px_160px_160px_230px] items-center border-b border-slate-100 transition-all duration-300 last:border-b-0 ${
                        modificata
                          ? "bg-blue-50"
                          : index % 2 === 0
                            ? "bg-white"
                            : "bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0 px-4 py-3">
                        <p className="text-xs font-black text-slate-500">{prodotto.supplier_code || "-"}</p>
                        <h3 className="mt-1 truncate text-base font-black text-slate-950">{prodotto.nome_prodotto}</h3>
                      </div>

                      <div className="px-4 py-3 text-center">
                        <p className="text-xl font-black text-slate-950">{prodottoCompilato(prodotto) ? valore : "—"}</p>
                        <p className="text-xs font-bold text-slate-500">{prodottoCompilato(prodotto) ? "inserita" : "da compilare"}</p>
                      </div>

                      <div className="px-4 py-3 text-center text-base font-black text-slate-600">
                        {prodotto.min_stock} / {prodotto.max_stock}
                      </div>

                      <div className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase ${classeStato(stato)}`}>
                          {stato}
                        </span>
                      </div>

                      <div className="px-4 py-3">
                        {renderQuantitaControl(prodotto)}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {prodottiFiltrati.map((prodotto) => {
                  const stato = statoSoglia(prodotto)
                  const modificata = ultimaModifica === prodotto.id

                  return (
                    <div
                      key={prodotto.id}
                      className={`rounded-2xl border p-3 shadow-sm transition-all duration-300 ${
                        modificata ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-slate-500">{prodotto.supplier_code || "-"}</p>
                          <h3 className="mt-1 text-sm font-black leading-tight text-slate-950">{prodotto.nome_prodotto}</h3>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">
                              Range: {prodotto.min_stock}/{prodotto.max_stock}
                            </span>
                            <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase ${classeStato(stato)}`}>
                              {stato}
                            </span>
                          </div>
                        </div>

                        {renderQuantitaControl(prodotto)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {prodottiFiltrati.length === 0 && (
                <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                  Nessun prodotto trovato.
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-8">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-400">Prodotti compilati</p>
              <p className="text-xl font-black">{prodottiCompilati} / {prodottiTotali}</p>
            </div>

            <div>
              <p className="text-[11px] font-black uppercase text-slate-400">Quantità totale</p>
              <p className="text-xl font-black">{quantitaTotaleCompilata} pezzi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={salvaBozza}
              disabled={!!blocco || isDraftSaving || isSaving || loading}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-700 px-6 text-base font-black text-white transition-all hover:bg-slate-600 disabled:bg-slate-500"
            >
              {isDraftSaving ? (
                "Salvataggio..."
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Salva bozza
                </>
              )}
            </button>

            <button
              onClick={inviaGiacenze}
              disabled={!!blocco || isSaving || loading}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-base font-black text-white transition-all hover:bg-blue-700 disabled:bg-slate-500"
            >
              {isSaving ? (
                "Invio..."
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Invia giacenze
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
