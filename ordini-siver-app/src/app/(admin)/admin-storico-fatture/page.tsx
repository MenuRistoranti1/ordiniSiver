"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Restaurant = {
  id: string
  name: string
}

type InvoiceImport = {
  id: string
  created_at?: string | null
  supplier?: string | null
  invoice_number?: string | null
  invoice_date?: string | null
  restaurant_id?: string | null
  restaurant_name?: string | null
  total?: number | string | null
  pdf_name?: string | null
  pdf_url?: string | null
  imported_by?: string | null
  rows_count?: number | null
  notes?: string | null
}

type InvoiceRow = {
  id: string
  invoice_import_id: string
  supplier_code?: string | null
  product_name?: string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  total_price?: number | string | null
  matched_order_id?: string | null
  matched?: boolean | null
  anomaly?: boolean | null
  anomaly_note?: string | null
}

export default function AdminStoricoFatture() {
  const [fatture, setFatture] = useState<InvoiceImport[]>([])
  const [righe, setRighe] = useState<Record<string, InvoiceRow[]>>({})
  const [locali, setLocali] = useState<Restaurant[]>([])

  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState("")
  const [ricerca, setRicerca] = useState("")
  const [localeId, setLocaleId] = useState("")
  const [dal, setDal] = useState("")
  const [al, setAl] = useState("")
  const [fatturaAperta, setFatturaAperta] = useState<string>("")

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

    const oggi = new Date()
    const primo = new Date(oggi.getFullYear(), oggi.getMonth(), 1)

    setDal(formatDate(primo))
    setAl(formatDate(oggi))

    caricaDati()
  }, [])

  function formatDate(data: Date) {
    return data.toISOString().split("T")[0]
  }

  function normalizza(testo: string) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  function numero(valore: any) {
    const n = Number(String(valore || "0").replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }

  function euro(valore: any) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(numero(valore))
  }

  function dataIt(data?: string | null) {
    if (!data) return "-"
    const d = new Date(data)
    if (Number.isNaN(d.getTime())) return data
    return d.toLocaleDateString("it-IT")
  }

  async function caricaDati() {
    setLoading(true)
    setErrore("")

    try {
      const [fattureRes, localiRes] = await Promise.all([
        supabase
          .from("invoice_imports")
          .select("*")
          .order("invoice_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("restaurants").select("id, name").order("name"),
      ])

      if (fattureRes.error) throw fattureRes.error
      if (localiRes.error) throw localiRes.error

      const fattureData = (fattureRes.data || []) as InvoiceImport[]
      setFatture(fattureData)
      setLocali((localiRes.data || []) as Restaurant[])

      if (fattureData.length > 0) {
        const ids = fattureData.map((f) => f.id)

        const { data: righeData, error: righeError } = await supabase
          .from("invoice_import_rows")
          .select("*")
          .in("invoice_import_id", ids)
          .order("created_at", { ascending: true })

        if (righeError) throw righeError

        const grouped = ((righeData || []) as InvoiceRow[]).reduce(
          (acc: Record<string, InvoiceRow[]>, riga) => {
            if (!acc[riga.invoice_import_id]) acc[riga.invoice_import_id] = []
            acc[riga.invoice_import_id].push(riga)
            return acc
          },
          {}
        )

        setRighe(grouped)
      } else {
        setRighe({})
      }
    } catch (error: any) {
      console.log(error)
      setErrore(error?.message || "Errore caricamento storico fatture")
    }

    setLoading(false)
  }

  const fattureFiltrate = useMemo(() => {
    const q = normalizza(ricerca)

    return fatture.filter((fattura) => {
      const data = fattura.invoice_date || fattura.created_at?.split("T")[0] || ""
      const righeFattura = righe[fattura.id] || []

      const testo = normalizza(
        [
          fattura.invoice_number,
          fattura.supplier,
          fattura.restaurant_name,
          fattura.pdf_name,
          ...righeFattura.map((r) =>
            [r.supplier_code, r.product_name, r.anomaly_note].join(" ")
          ),
        ]
          .filter(Boolean)
          .join(" ")
      )

      if (dal && data && data < dal) return false
      if (al && data && data > al) return false
      if (localeId && String(fattura.restaurant_id) !== String(localeId)) return false
      if (q && !testo.includes(q)) return false

      return true
    })
  }, [fatture, righe, ricerca, localeId, dal, al])

  const totaleFatture = fattureFiltrate.length

  const totaleValore = fattureFiltrate.reduce(
    (sum, fattura) => sum + numero(fattura.total),
    0
  )

  const totaleRighe = fattureFiltrate.reduce(
    (sum, fattura) => sum + (righe[fattura.id]?.length || 0),
    0
  )

  const totaleAnomalie = fattureFiltrate.reduce(
    (sum, fattura) =>
      sum + (righe[fattura.id] || []).filter((r) => r.anomaly).length,
    0
  )

  function toggleFattura(id: string) {
    setFatturaAperta((attuale) => (attuale === id ? "" : id))
  }

  function tornaDashboard() {
    window.location.href = "/admin-dashboard"
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-10 pt-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-3xl">
                Storico fatture
              </h1>

              <p className="mt-1 text-sm font-bold text-slate-300">
                Archivio fatture importate, righe prodotto e anomalie
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                onClick={tornaDashboard}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </button>

              <button
                onClick={logout}
                className="rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-500">
              Fatture
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              {totaleFatture}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-500">
              Valore totale
            </p>
            <h2 className="mt-2 text-3xl font-black text-green-700">
              {euro(totaleValore)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-500">
              Righe prodotto
            </p>
            <h2 className="mt-2 text-3xl font-black text-blue-700">
              {totaleRighe}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-500">
              Anomalie
            </p>
            <h2
              className={`mt-2 text-3xl font-black ${
                totaleAnomalie > 0 ? "text-red-700" : "text-emerald-700"
              }`}
            >
              {totaleAnomalie}
            </h2>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[160px_160px_1fr_220px_160px]">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dal}
                onChange={(e) => setDal(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-bold outline-none focus:border-blue-600"
              />
            </div>

            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={al}
                onChange={(e) => setAl(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-bold outline-none focus:border-blue-600"
              />
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca numero fattura, locale, codice, prodotto..."
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-bold outline-none focus:border-blue-600"
              />
            </div>

            <select
              value={localeId}
              onChange={(e) => setLocaleId(e.target.value)}
              className="h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-blue-600"
            >
              <option value="">Tutti i locali</option>
              {locali.map((locale) => (
                <option key={locale.id} value={locale.id}>
                  {locale.name}
                </option>
              ))}
            </select>

            <button
              onClick={caricaDati}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:bg-slate-400"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>
          </div>
        </section>

        {errore && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">
            {errore}
          </section>
        )}

        {loading ? (
          <section className="rounded-2xl bg-white p-8 text-center text-sm font-black text-slate-500 shadow-sm">
            Caricamento storico fatture...
          </section>
        ) : (
          <section className="space-y-3">
            {fattureFiltrate.map((fattura) => {
              const righeFattura = righe[fattura.id] || []
              const anomalie = righeFattura.filter((r) => r.anomaly)
              const matched = righeFattura.filter((r) => r.matched)
              const aperta = fatturaAperta === fattura.id

              return (
                <article
                  key={fattura.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    onClick={() => toggleFattura(fattura.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />

                          <h2 className="text-lg font-black text-slate-950">
                            Fattura {fattura.invoice_number || "Senza numero"}
                          </h2>

                          {anomalie.length > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              {anomalie.length} anomalie
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              OK
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm font-bold text-slate-600">
                          {fattura.restaurant_name || "Locale non indicato"} ·{" "}
                          {fattura.supplier || "Fornitore"} ·{" "}
                          {dataIt(fattura.invoice_date || fattura.created_at)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:min-w-[520px]">
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[11px] font-black uppercase text-slate-500">
                            Totale
                          </p>
                          <p className="font-black text-slate-950">
                            {euro(fattura.total)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[11px] font-black uppercase text-slate-500">
                            Righe
                          </p>
                          <p className="font-black text-slate-950">
                            {righeFattura.length || fattura.rows_count || 0}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[11px] font-black uppercase text-slate-500">
                            Match
                          </p>
                          <p className="font-black text-green-700">
                            {matched.length}
                          </p>
                        </div>

                        <div className="flex items-center justify-center rounded-xl bg-slate-50 p-2">
                          {aperta ? (
                            <ChevronUp className="h-5 w-5 text-slate-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {aperta && (
                    <div className="border-t border-slate-100 p-3">
                      <div className="hidden rounded-xl bg-slate-950 text-[11px] font-black uppercase tracking-wide text-white md:grid md:grid-cols-[120px_1fr_90px_100px_100px_120px_1fr]">
                        <div className="px-3 py-2">Codice</div>
                        <div className="px-3 py-2">Prodotto</div>
                        <div className="px-3 py-2 text-right">Qtà</div>
                        <div className="px-3 py-2 text-right">Prezzo</div>
                        <div className="px-3 py-2 text-right">Totale</div>
                        <div className="px-3 py-2">Match</div>
                        <div className="px-3 py-2">Note</div>
                      </div>

                      <div className="space-y-2 md:space-y-0">
                        {righeFattura.map((riga, index) => (
                          <div
                            key={riga.id}
                            className={`rounded-xl border p-3 text-sm md:grid md:grid-cols-[120px_1fr_90px_100px_100px_120px_1fr] md:items-center md:rounded-none md:border-x-0 md:border-t-0 ${
                              riga.anomaly
                                ? "border-red-200 bg-red-50"
                                : index % 2 === 0
                                  ? "border-slate-100 bg-white"
                                  : "border-slate-100 bg-slate-50"
                            }`}
                          >
                            <div className="font-black text-slate-800">
                              {riga.supplier_code || "-"}
                            </div>

                            <div className="mt-1 font-bold text-slate-950 md:mt-0">
                              {riga.product_name || "-"}
                            </div>

                            <div className="mt-1 font-black text-slate-700 md:mt-0 md:text-right">
                              {numero(riga.quantity)}
                            </div>

                            <div className="mt-1 font-black text-slate-700 md:mt-0 md:text-right">
                              {euro(riga.unit_price)}
                            </div>

                            <div className="mt-1 font-black text-slate-950 md:mt-0 md:text-right">
                              {euro(riga.total_price)}
                            </div>

                            <div className="mt-2 md:mt-0">
                              {riga.matched ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-black text-green-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Abbinato
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-black text-red-700">
                                  <XCircle className="h-3 w-3" />
                                  No match
                                </span>
                              )}
                            </div>

                            <div className="mt-2 text-xs font-bold text-slate-600 md:mt-0">
                              {riga.anomaly_note || "-"}
                            </div>
                          </div>
                        ))}

                        {righeFattura.length === 0 && (
                          <div className="rounded-xl bg-slate-50 p-4 text-center text-sm font-black text-slate-500">
                            Nessuna riga salvata per questa fattura.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}

            {fattureFiltrate.length === 0 && (
              <section className="rounded-2xl bg-white p-8 text-center text-sm font-black text-slate-500 shadow-sm">
                Nessuna fattura trovata con i filtri selezionati.
              </section>
            )}
          </section>
        )}
      </div>
    </main>
  )
}