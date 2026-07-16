"use client"

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  FileText,
  ShoppingCart,
  TrendingUp,
} from "lucide-react"
import { LocaleShell } from "@/components/locale/LocaleShell"
import { DashboardHeader } from "@/components/locale/dashboard/DashboardHeader"
import { DashboardStatus } from "@/components/locale/dashboard/DashboardStatus"
import { DashboardProgress } from "@/components/locale/dashboard/DashboardProgress"
import { DashboardKpiCard } from "@/components/locale/dashboard/DashboardKpiCard"
import { DashboardTopList } from "@/components/locale/dashboard/DashboardTopList"
import { useLocaleDashboard } from "@/hooks/useLocaleDashboard"

export default function Dashboard() {
  const {
    localeNome,
    localeId,
    utenteNome,
    localiDisponibili,
    selectorAperto,
    setSelectorAperto,
    giacenzeInfo,
    giacenzeOk,
    messaggiNonLetti,
    documentiNonLetti,
    topOrdinati,
    topRotti,
    totaleOrdini,
    totaleRotture,
    loading,
    statoOperativo,
    cambiaLocale,
    caricaTutto,
    vai,
    vaiNuovoOrdine,
    salutoOrario,
  } = useLocaleDashboard()

  return (
    <LocaleShell>
      {localiDisponibili.length > 1 && (
        <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
            Locale attivo
          </p>

          <div className="relative max-w-md">
            <button
              type="button"
              onClick={() => setSelectorAperto((value) => !value)}
              className="flex w-full items-center justify-between gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-left text-sm font-black text-white"
            >
              <span className="truncate">
                {localeNome || "Seleziona locale"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </button>

            {selectorAperto && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
                {localiDisponibili.map((locale) => (
                  <button
                    key={locale.restaurant_id}
                    type="button"
                    onClick={() => cambiaLocale(locale)}
                    className={`w-full px-4 py-3 text-left text-sm font-black hover:bg-blue-50 ${
                      String(locale.restaurant_id) === String(localeId)
                        ? "bg-blue-600 text-white hover:bg-blue-600"
                        : ""
                    }`}
                  >
                    {locale.restaurant_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <DashboardHeader
        userName={utenteNome}
        restaurantName={localeNome}
        greeting={salutoOrario()}
        loading={loading}
        onRefresh={() => void caricaTutto(localeId)}
      />

      <DashboardStatus
        title={statoOperativo.titolo}
        text={statoOperativo.testo}
        className={statoOperativo.classe}
        icon={statoOperativo.icona}
        showAction={!giacenzeOk}
        actionLabel="Compila giacenze"
        onAction={() => vai("/giacenze")}
      />

      <DashboardProgress
        title="Avanzamento giacenze"
        subtitle={`${giacenzeInfo.compilati} di ${giacenzeInfo.totale} prodotti compilati`}
        percent={giacenzeInfo.percentuale}
        color={giacenzeOk ? "green" : "amber"}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardKpiCard
          label="Stato giacenze"
          value={`${giacenzeInfo.compilati}/${giacenzeInfo.totale}`}
          note={`${giacenzeInfo.percentuale}% compilato`}
          icon={giacenzeOk ? CheckCircle2 : AlertTriangle}
          color={
            giacenzeOk
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }
        />

        <DashboardKpiCard
          label="Ordini periodo"
          value={totaleOrdini}
          note="Righe ordine del mese"
          icon={ShoppingCart}
          color="bg-blue-100 text-blue-700"
        />

        <DashboardKpiCard
          label="Messaggi"
          value={messaggiNonLetti}
          note="Non letti admin"
          icon={Bell}
          color={
            messaggiNonLetti > 0
              ? "bg-red-100 text-red-700"
              : "bg-slate-100 text-slate-700"
          }
        />

        <DashboardKpiCard
          label="Documenti"
          value={documentiNonLetti}
          note={
            documentiNonLetti > 0
              ? "Nuovi da leggere"
              : "Nessun nuovo documento"
          }
          icon={FileText}
          color={
            documentiNonLetti > 0
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }
        />

        <DashboardKpiCard
          label="Dispersioni"
          value={totaleRotture}
          note="Totale top dispersioni"
          icon={TrendingUp}
          color={
            totaleRotture > 0
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardTopList
          title="Top prodotti più ordinati"
          subtitle="I 5 prodotti più richiesti nel mese corrente"
          items={topOrdinati}
          empty="Nessun ordine trovato nel periodo."
        />

        <DashboardTopList
          title="Prodotti con possibile dispersione"
          subtitle="Formula: prima giacenza + consegnato - ultima giacenza"
          items={topRotti}
          empty="Servono almeno due giacenze e consegne registrate."
          danger
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <button
          type="button"
          onClick={() => vai("/giacenze")}
          className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:shadow-xl"
        >
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            Step 1
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            Giacenze settimana
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Inserisci o controlla le giacenze obbligatorie settimanali.
          </p>
        </button>

        <button
          type="button"
          onClick={vaiNuovoOrdine}
          className={`rounded-3xl border p-5 text-left shadow-sm transition-all duration-300 ${
            giacenzeOk
              ? "border-slate-200 bg-white hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:shadow-xl"
              : "cursor-not-allowed border-amber-300 bg-amber-50"
          }`}
        >
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            {giacenzeOk ? "Step 2" : "Bloccato"}
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            {giacenzeOk ? "Nuovo ordine" : "Nuovo ordine bloccato"}
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-600">
            {giacenzeOk
              ? "Compila e invia l'ordine della settimana."
              : "Devi prima completare le giacenze."}
          </p>
        </button>

        <button
          type="button"
          onClick={() => vai("/storico-giacenze")}
          className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:shadow-xl"
        >
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Archivio
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            Storico giacenze
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Consulta le giacenze già inviate.
          </p>
        </button>

        <button
          type="button"
          onClick={() => vai("/storico-ordini")}
          className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:shadow-xl"
        >
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Archivio
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            Storico ordini
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Consulta gli ordini già inviati.
          </p>
        </button>

        <button
          type="button"
          onClick={() => vai("/documenti")}
          className={`rounded-3xl border p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
            documentiNonLetti > 0
              ? "border-red-200 bg-red-50 hover:border-red-300"
              : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Documenti
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                Documenti locale
              </h2>
            </div>

            {documentiNonLetti > 0 && (
              <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
                {documentiNonLetti} nuovi
              </span>
            )}
          </div>

          <p className="mt-2 text-sm font-bold text-slate-600">
            {documentiNonLetti > 0
              ? `Hai ${documentiNonLetti} documenti da leggere.`
              : "Nessun nuovo documento. Puoi consultare l'archivio completo."}
          </p>
        </button>

        <button
          type="button"
          onClick={() => vai("/messaggi")}
          className="rounded-3xl bg-blue-700 p-5 text-left text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-500/20"
        >
          <p className="text-xs font-black uppercase tracking-wide text-blue-100">
            Comunicazioni
          </p>
          <h2 className="mt-2 text-xl font-black">
            Messaggi con admin
          </h2>
          <p className="mt-2 text-sm font-bold text-blue-100">
            Scrivi segnalazioni, richieste o comunicazioni
            all&apos;amministrazione.
          </p>
        </button>
      </section>
    </LocaleShell>
  )
}