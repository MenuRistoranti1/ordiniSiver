"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  Package,
  Store,
  Euro,
  TrendingUp,
  AlertTriangle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AdminStatistiche() {
  const [ordini, setOrdini] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [locali, setLocali] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [dal, setDal] = useState("")
  const [al, setAl] = useState("")
  const [localeId, setLocaleId] = useState("")

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

    const oggi = new Date()
    const primo = new Date(oggi.getFullYear(), oggi.getMonth(), 1)

    setDal(primo.toISOString().split("T")[0])
    setAl(oggi.toISOString().split("T")[0])

    caricaDati()
  }, [])

  async function caricaDati() {
    setLoading(true)

    const { data: ordiniDb, error: errorOrdini } = await supabase
      .from("ordini")
      .select("*")
      .order("created_at", { ascending: false })

    const { data: productsDb } = await supabase
      .from("products")
      .select("*")

    const { data: localiDb } = await supabase
      .from("restaurants")
      .select("id, name")
      .order("name")

    if (errorOrdini) {
      console.log(errorOrdini)
      alert("Errore caricamento statistiche")
      setLoading(false)
      return
    }

    setOrdini(ordiniDb || [])
    setProducts(productsDb || [])
    setLocali(localiDb || [])
    setLoading(false)
  }

  function logout() {
    localStorage.removeItem("admin")
    window.location.href = "/"
  }

  const ordiniFiltrati = useMemo(() => {
    return ordini.filter((ordine) => {
      const data = ordine.created_at?.split("T")[0]

      if (dal && data < dal) return false
      if (al && data > al) return false
      if (localeId && ordine.locale_id !== localeId) return false

      return true
    })
  }, [ordini, dal, al, localeId])

  function prezzoProdotto(nome: string) {
    const prodotto = products.find(
      (p) =>
        String(p.name || "").toLowerCase().trim() ===
        String(nome || "").toLowerCase().trim()
    )

    return Number(prodotto?.price || 0)
  }

  const totaleQuantita = ordiniFiltrati.reduce(
    (sum, ordine) => sum + Number(ordine.quantita || 0),
    0
  )

  const valoreTotale = ordiniFiltrati.reduce((sum, ordine) => {
    return sum + Number(ordine.quantita || 0) * prezzoProdotto(ordine.nome_prodotto)
  }, 0)

  const prodottiTop = useMemo(() => {
    const mappa: any = {}

    ordiniFiltrati.forEach((ordine) => {
      const nome = ordine.nome_prodotto || "Senza nome"

      if (!mappa[nome]) {
        mappa[nome] = {
          nome,
          quantita: 0,
          valore: 0,
          righe: 0,
        }
      }

      const qta = Number(ordine.quantita || 0)

      mappa[nome].quantita += qta
      mappa[nome].valore += qta * prezzoProdotto(nome)
      mappa[nome].righe += 1
    })

    return Object.values(mappa)
      .sort((a: any, b: any) => b.quantita - a.quantita)
      .slice(0, 10)
  }, [ordiniFiltrati, products])

  const localiTop = useMemo(() => {
    const mappa: any = {}

    ordiniFiltrati.forEach((ordine) => {
      const nome = ordine.locale_nome || "Locale"

      if (!mappa[nome]) {
        mappa[nome] = {
          nome,
          quantita: 0,
          valore: 0,
          righe: 0,
        }
      }

      const qta = Number(ordine.quantita || 0)

      mappa[nome].quantita += qta
      mappa[nome].valore += qta * prezzoProdotto(ordine.nome_prodotto)
      mappa[nome].righe += 1
    })

    return Object.values(mappa)
      .sort((a: any, b: any) => b.quantita - a.quantita)
      .slice(0, 10)
  }, [ordiniFiltrati, products])

  const prodottiCritici = useMemo(() => {
    const mappa: any = {}

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
    const mappa: any = {}

    ordiniFiltrati.forEach((ordine) => {
      const settimana =
        ordine.settimana_key || ordine.created_at?.split("T")[0] || "Senza data"

      if (!mappa[settimana]) {
        mappa[settimana] = {
          settimana,
          quantita: 0,
          valore: 0,
        }
      }

      const qta = Number(ordine.quantita || 0)

      mappa[settimana].quantita += qta
      mappa[settimana].valore += qta * prezzoProdotto(ordine.nome_prodotto)
    })

    return Object.values(mappa).sort((a: any, b: any) =>
      String(a.settimana).localeCompare(String(b.settimana))
    )
  }, [ordiniFiltrati, products])

  const maxSettimana = Math.max(
    ...settimane.map((s: any) => Number(s.quantita || 0)),
    1
  )

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                OrdiniSiver
              </h1>
              <p className="mt-0.5 text-xs font-medium text-slate-300">
                Admin · Statistiche consumi
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => (window.location.href = "/admin-dashboard")}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
              >
                Home Admin
              </button>

              <button
                onClick={logout}
                className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            Statistiche consumi
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
            Analisi ordini, consumi, valore stimato e prodotti critici.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <input
            type="date"
            value={dal}
            onChange={(e) => setDal(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
          />

          <input
            type="date"
            value={al}
            onChange={(e) => setAl(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
          />

          <select
            value={localeId}
            onChange={(e) => setLocaleId(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
          >
            <option value="">Tutti i locali</option>
            {locali.map((locale) => (
              <option key={locale.id} value={locale.id}>
                {locale.name}
              </option>
            ))}
          </select>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            Caricamento statistiche...
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Righe ordine
                    </p>
                    <h3 className="text-3xl font-black text-slate-950">
                      {ordiniFiltrati.length}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Quantità
                    </p>
                    <h3 className="text-3xl font-black text-slate-950">
                      {totaleQuantita}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Euro className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Valore stimato
                    </p>
                    <h3 className="text-3xl font-black text-slate-950">
                      €{valoreTotale.toFixed(2)}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Store className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Locali attivi
                    </p>
                    <h3 className="text-3xl font-black text-slate-950">
                      {[...new Set(ordiniFiltrati.map((o) => o.locale_id))].length}
                    </h3>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-black text-slate-950">
                    Andamento per settimana
                  </h3>
                </div>

                <div className="h-72 overflow-x-auto overflow-y-hidden">
                  <div className="flex h-full min-w-max items-end gap-4 pr-4">
                    {settimane.map((s: any) => (
                      <div
                        key={s.settimana}
                        className="flex w-24 shrink-0 flex-col items-center"
                      >
                        <div
                          className="w-full rounded-t-2xl bg-blue-600"
                          style={{
                            height: `${Math.min(
                              Math.max((s.quantita / maxSettimana) * 240, 10),
                              240
                            )}px`,
                          }}
                        />

                        <span className="mt-2 text-center text-[10px] font-bold text-slate-500">
                          {s.settimana}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-black text-slate-950">
                    Prodotti critici inevasi
                  </h3>
                </div>

                <div className="space-y-3">
                  {prodottiCritici.map((p: any) => (
                    <div
                      key={p.nome}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">
                          {p.nome}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {p.righe} righe inevase
                        </p>
                      </div>

                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                        {p.inevasa}
                      </span>
                    </div>
                  ))}

                  {prodottiCritici.length === 0 && (
                    <p className="text-sm font-semibold text-slate-500">
                      Nessun prodotto critico nel periodo.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-lg font-black text-slate-950">
                  Top prodotti ordinati
                </h3>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[1fr_100px_120px] bg-slate-950 text-[11px] font-bold uppercase text-white">
                    <div className="px-3 py-2">Prodotto</div>
                    <div className="px-3 py-2">Quantità</div>
                    <div className="px-3 py-2">Valore</div>
                  </div>

                  {prodottiTop.map((p: any) => (
                    <div
                      key={p.nome}
                      className="grid grid-cols-[1fr_100px_120px] border-b border-slate-100 last:border-b-0"
                    >
                      <div className="truncate px-3 py-2 text-sm font-bold">
                        {p.nome}
                      </div>
                      <div className="px-3 py-2 text-sm font-bold text-blue-700">
                        {p.quantita}
                      </div>
                      <div className="px-3 py-2 text-sm font-bold text-slate-600">
                        €{p.valore.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-lg font-black text-slate-950">
                  Top locali per consumo
                </h3>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[1fr_100px_120px] bg-slate-950 text-[11px] font-bold uppercase text-white">
                    <div className="px-3 py-2">Locale</div>
                    <div className="px-3 py-2">Quantità</div>
                    <div className="px-3 py-2">Valore</div>
                  </div>

                  {localiTop.map((l: any) => (
                    <div
                      key={l.nome}
                      className="grid grid-cols-[1fr_100px_120px] border-b border-slate-100 last:border-b-0"
                    >
                      <div className="truncate px-3 py-2 text-sm font-bold">
                        {l.nome}
                      </div>
                      <div className="px-3 py-2 text-sm font-bold text-blue-700">
                        {l.quantita}
                      </div>
                      <div className="px-3 py-2 text-sm font-bold text-slate-600">
                        €{l.valore.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
