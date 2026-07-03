"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Euro,
  Package,
  RefreshCw,
  Store,
  TrendingUp,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Ordine = any
type Product = any
type Locale = any

export default function AdminStatistiche() {
  const [ordini, setOrdini] = useState<Ordine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locali, setLocali] = useState<Locale[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState("")

  const [dal, setDal] = useState("")
  const [al, setAl] = useState("")
  const [localeId, setLocaleId] = useState("")

  useEffect(() => {
    inizializza()
  }, [])

  async function inizializza() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      window.location.href = "/admin"
      return
    }

    if (user.app_metadata?.role !== "admin") {
      await supabase.auth.signOut()
      window.location.href = "/admin"
      return
    }

    const oggi = new Date()
    const primo = new Date(oggi.getFullYear(), oggi.getMonth(), 1)

    setDal(primo.toISOString().split("T")[0])
    setAl(oggi.toISOString().split("T")[0])

    await caricaDati()
  }

  async function caricaDati() {
    setLoading(true)
    setErrore("")

    try {
      const [ordiniRes, productsRes, localiRes] = await Promise.all([
        supabase
          .from("ordini")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("products").select("*"),
        supabase.from("restaurants").select("id, name").order("name"),
      ])

      if (ordiniRes.error) throw ordiniRes.error
      if (productsRes.error) throw productsRes.error
      if (localiRes.error) throw localiRes.error

      setOrdini(ordiniRes.data || [])
      setProducts(productsRes.data || [])
      setLocali(localiRes.data || [])
    } catch (error: any) {
      console.log(error)
      setErrore(error?.message || "Errore caricamento statistiche")
    }

    setLoading(false)
  }

  function normalizza(testo: any) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  function normalizzaCodice(codice: any) {
    return String(codice || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
  }

  function prezzoNumero(prezzo: any) {
    const numero = Number(String(prezzo || "0").replace("€", "").replace(",", "."))
    return Number.isFinite(numero) ? numero : 0
  }

  function euro(valore: number) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(valore || 0)
  }

  function prodottoDaOrdine(ordine: any) {
    const codiceOrdine = normalizzaCodice(ordine.supplier_code || "")

    if (codiceOrdine) {
      const byCode = products.find(
        (p) => normalizzaCodice(p.supplier_code || "") === codiceOrdine
      )
      if (byCode) return byCode
    }

    const nomeOrdine = normalizza(ordine.nome_prodotto || "")

    return (
      products.find((p) => normalizza(p.name || "") === nomeOrdine) || null
    )
  }

  const ordiniFiltrati = useMemo(() => {
    return ordini.filter((ordine) => {
      const data =
        ordine.settimana_key || ordine.created_at?.split("T")[0] || ""

      if (dal && data && data < dal) return false
      if (al && data && data > al) return false
      if (localeId && String(ordine.locale_id) !== String(localeId)) return false

      return true
    })
  }, [ordini, dal, al, localeId])

  const totaleQuantita = ordiniFiltrati.reduce(
    (sum, ordine) => sum + Number(ordine.quantita || 0),
    0
  )

  const valoreTotale = ordiniFiltrati.reduce((sum, ordine) => {
    const prodotto = prodottoDaOrdine(ordine)
    return sum + Number(ordine.quantita || 0) * prezzoNumero(prodotto?.price)
  }, 0)

  const localiAttivi = new Set(
    ordiniFiltrati.map((o) => String(o.locale_id || "")).filter(Boolean)
  ).size

  const quantitaConsegnata = ordiniFiltrati.reduce(
    (sum, ordine) => sum + Number(ordine.quantita_consegnata || 0),
    0
  )

  const quantitaInevasa = Math.max(totaleQuantita - quantitaConsegnata, 0)

  const percentualeEvasione = totaleQuantita
    ? Math.round((quantitaConsegnata / totaleQuantita) * 100)
    : 0

  const prodottiTop = useMemo(() => {
    const mappa: Record<string, any> = {}

    ordiniFiltrati.forEach((ordine) => {
      const nome = ordine.nome_prodotto || "Senza nome"
      const prodotto = prodottoDaOrdine(ordine)
      const qta = Number(ordine.quantita || 0)
      const valore = qta * prezzoNumero(prodotto?.price)

      if (!mappa[nome]) {
        mappa[nome] = {
          nome,
          quantita: 0,
          valore: 0,
          righe: 0,
        }
      }

      mappa[nome].quantita += qta
      mappa[nome].valore += valore
      mappa[nome].righe += 1
    })

    return Object.values(mappa)
      .sort((a: any, b: any) => b.quantita - a.quantita)
      .slice(0, 10)
  }, [ordiniFiltrati, products])

  const localiTop = useMemo(() => {
    const mappa: Record<string, any> = {}

    ordiniFiltrati.forEach((ordine) => {
      const nome = ordine.locale_nome || "Locale"
      const prodotto = prodottoDaOrdine(ordine)
      const qta = Number(ordine.quantita || 0)
      const valore = qta * prezzoNumero(prodotto?.price)

      if (!mappa[nome]) {
        mappa[nome] = {
          nome,
          quantita: 0,
          valore: 0,
          righe: 0,
        }
      }

      mappa[nome].quantita += qta
      mappa[nome].valore += valore
      mappa[nome].righe += 1
    })

    return Object.values(mappa)
      .sort((a: any, b: any) => b.quantita - a.quantita)
      .slice(0, 10)
  }, [ordiniFiltrati, products])

  const prodottiCritici = useMemo(() => {
    const mappa: Record<string, any> = {}

    ordiniFiltrati.forEach((ordine) => {
      const nome = ordine.nome_prodotto || "Senza nome"
      const consegnata = Number(ordine.quantita_consegnata || 0)
      const ordinata = Number(ordine.quantita || 0)
      const inevasa = Math.max(ordinata - consegnata, 0)

      if (inevasa <= 0) return

      if (!mappa[nome]) {
        mappa[nome] = {
          nome,
          inevasa: 0,
          righe: 0,
        }
      }

      mappa[nome].inevasa += inevasa
      mappa[nome].righe += 1
    })

    return Object.values(mappa)
      .sort((a: any, b: any) => b.inevasa - a.inevasa)
      .slice(0, 10)
  }, [ordiniFiltrati])

  const settimane = useMemo(() => {
    const mappa: Record<string, any> = {}

    ordiniFiltrati.forEach((ordine) => {
      const settimana =
        ordine.settimana_key || ordine.created_at?.split("T")[0] || "Senza data"
      const prodotto = prodottoDaOrdine(ordine)
      const qta = Number(ordine.quantita || 0)
      const valore = qta * prezzoNumero(prodotto?.price)

      if (!mappa[settimana]) {
        mappa[settimana] = {
          settimana,
          quantita: 0,
          valore: 0,
        }
      }

      mappa[settimana].quantita += qta
      mappa[settimana].valore += valore
    })

    return Object.values(mappa).sort((a: any, b: any) =>
      String(a.settimana).localeCompare(String(b.settimana))
    )
  }, [ordiniFiltrati, products])

  const maxSettimana = Math.max(
    ...settimane.map((s: any) => Number(s.quantita || 0)),
    1
  )

  function StatCard({
    title,
    value,
    note,
    icon: Icon,
    tone,
  }: {
    title: string
    value: string | number
    note: string
    icon: any
    tone: string
  }) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {title}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              {value}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{note}</p>
          </div>
          <div className={`rounded-2xl p-3 ${tone}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    )
  }

  function ListaRanking({
    title,
    subtitle,
    items,
    type,
  }: {
    title: string
    subtitle: string
    items: any[]
    type: "product" | "locale"
  }) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">{subtitle}</p>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={`${item.nome}-${index}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">
                  #{index + 1} · {item.nome}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {item.righe} righe · {euro(Number(item.valore || 0))}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl bg-blue-100 px-3 py-2 text-lg font-black text-blue-700">
                {item.quantita}
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
              Nessun dato nel periodo.
            </p>
          )}
        </div>
      </section>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-8">
        <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-blue-300">
                Analisi consumi
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                Statistiche
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-bold text-slate-300 sm:text-base">
                Controlla quantità ordinate, valore stimato, trend settimanali, prodotti critici e consumi per locale.
              </p>
            </div>

            <button
              onClick={caricaDati}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:bg-slate-600"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Aggiorno..." : "Aggiorna"}
            </button>
          </div>
        </header>

        {errore && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">
            {errore}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="date"
              value={dal}
              onChange={(e) => setDal(e.target.value)}
              className="h-12 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
            />

            <input
              type="date"
              value={al}
              onChange={(e) => setAl(e.target.value)}
              className="h-12 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
            />

            <select
              value={localeId}
              onChange={(e) => setLocaleId(e.target.value)}
              className="h-12 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
            >
              <option value="">Tutti i locali</option>
              {locali.map((locale) => (
                <option key={locale.id} value={locale.id}>
                  {locale.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            Caricamento statistiche...
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Righe ordine"
                value={ordiniFiltrati.length}
                note="Righe nel periodo"
                icon={Package}
                tone="bg-blue-100 text-blue-700"
              />
              <StatCard
                title="Quantità ordinate"
                value={totaleQuantita}
                note={`${quantitaConsegnata} consegnate · ${quantitaInevasa} inevase`}
                icon={TrendingUp}
                tone="bg-emerald-100 text-emerald-700"
              />
              <StatCard
                title="Valore stimato"
                value={euro(valoreTotale)}
                note="Basato sui prezzi anagrafica"
                icon={Euro}
                tone="bg-purple-100 text-purple-700"
              />
              <StatCard
                title="Locali attivi"
                value={localiAttivi}
                note={`${percentualeEvasione}% evasione quantità`}
                icon={Store}
                tone="bg-orange-100 text-orange-700"
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Andamento settimanale
                    </h2>
                    <p className="text-sm font-bold text-slate-500">
                      Quantità ordinate per settimana.
                    </p>
                  </div>
                </div>

                <div className="h-80 overflow-x-auto overflow-y-hidden rounded-2xl bg-slate-50 p-4">
                  <div className="flex h-full min-w-max items-end gap-4 pr-4">
                    {settimane.map((s: any) => (
                      <div
                        key={s.settimana}
                        className="flex w-28 shrink-0 flex-col items-center"
                      >
                        <div className="mb-2 text-xs font-black text-slate-700">
                          {s.quantita}
                        </div>
                        <div
                          className="w-full rounded-t-2xl bg-blue-600 shadow-sm"
                          style={{
                            height: `${Math.min(
                              Math.max((s.quantita / maxSettimana) * 240, 12),
                              240
                            )}px`,
                          }}
                        />
                        <span className="mt-2 text-center text-[11px] font-bold text-slate-500">
                          {s.settimana}
                        </span>
                        <span className="text-[10px] font-black text-slate-400">
                          {euro(Number(s.valore || 0))}
                        </span>
                      </div>
                    ))}

                    {settimane.length === 0 && (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">
                        Nessun dato nel periodo.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Prodotti critici
                    </h2>
                    <p className="text-sm font-bold text-slate-500">
                      Quantità inevasa per prodotto.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {prodottiCritici.map((p: any, index: number) => (
                    <div
                      key={`${p.nome}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {p.nome}
                        </p>
                        <p className="text-xs font-bold text-red-700">
                          {p.righe} righe inevase
                        </p>
                      </div>

                      <span className="rounded-2xl bg-red-100 px-3 py-2 text-lg font-black text-red-700">
                        {p.inevasa}
                      </span>
                    </div>
                  ))}

                  {prodottiCritici.length === 0 && (
                    <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                      Nessun prodotto critico nel periodo.
                    </p>
                  )}
                </div>
              </section>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <ListaRanking
                title="Top prodotti ordinati"
                subtitle="Prodotti con maggiore quantità nel periodo."
                items={prodottiTop}
                type="product"
              />

              <ListaRanking
                title="Top locali per consumo"
                subtitle="Locali con maggiore quantità ordinata."
                items={localiTop}
                type="locale"
              />
            </section>
          </>
        )}
      </section>
    </main>
  )
}