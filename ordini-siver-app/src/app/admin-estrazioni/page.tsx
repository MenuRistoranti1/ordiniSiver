"use client"

import { useEffect, useMemo, useState } from "react"
import { Menu, X } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AdminEstrazioni() {
  const [locali, setLocali] = useState<any[]>([])
  const [prodotti, setProdotti] = useState<any[]>([])
  const [localeId, setLocaleId] = useState("")
  const [prodotto, setProdotto] = useState("")
  const [dal, setDal] = useState("")
  const [al, setAl] = useState("")
  const [ordini, setOrdini] = useState<any[]>([])
  const [giacenze, setGiacenze] = useState<any[]>([])
  const [menuOpen, setMenuOpen] = useState(false)

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
    const { data: localiData } = await supabase
      .from("restaurants")
      .select("*")
      .order("name")

    const { data: prodottiData } = await supabase
      .from("products")
      .select("*")
      .order("name")

    const { data: ordiniData } = await supabase.from("ordini").select("*")

    const { data: giacenzeData } = await supabase
      .from("giacenze_settimana")
      .select("*")

    setLocali(localiData || [])
    setProdotti(prodottiData || [])
    setOrdini(ordiniData || [])
    setGiacenze(giacenzeData || [])
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

  const risultati = useMemo(() => {
    if (!prodotto) return []

    const ordiniFiltrati = ordini.filter((o) => {
      const data = o.settimana_key || o.created_at?.split("T")[0]

      if (localeId && String(o.locale_id) !== String(localeId)) return false
      if (prodotto && o.nome_prodotto !== prodotto) return false
      if (dal && data < dal) return false
      if (al && data > al) return false

      return true
    })

    return ordiniFiltrati.map((ordine) => {
      const giacenzeProdotto = giacenze
        .filter(
          (g) =>
            String(g.locale_id) === String(ordine.locale_id) &&
            String(g.nome_prodotto) === String(ordine.nome_prodotto)
        )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        )

      let rotti = 0

      for (let i = 1; i < giacenzeProdotto.length; i++) {
        const precedente = Number(giacenzeProdotto[i - 1].quantita || 0)
        const attuale = Number(giacenzeProdotto[i].quantita || 0)

        const consegnato = ordini
          .filter(
            (o) =>
              String(o.locale_id) === String(ordine.locale_id) &&
              String(o.nome_prodotto) === String(ordine.nome_prodotto)
          )
          .reduce(
            (acc, o) =>
              acc + Number(o.quantita_consegnata || o.quantita || 0),
            0
          )

        const differenza = precedente + consegnato - attuale

        if (differenza > 0) rotti += differenza
      }

      return {
        locale: ordine.locale_nome,
        prodotto: ordine.nome_prodotto,
        totale_ordinato: Number(ordine.quantita || 0),
        totale_consegnato: Number(
          ordine.quantita_consegnata || ordine.quantita || 0
        ),
        totale_rotto: rotti,
      }
    })
  }, [ordini, giacenze, localeId, prodotto, dal, al])

  const totaleOrdinato = risultati.reduce(
    (acc, r) => acc + r.totale_ordinato,
    0
  )

  const totaleConsegnato = risultati.reduce(
    (acc, r) => acc + r.totale_consegnato,
    0
  )

  const totaleRotto = risultati.reduce((acc, r) => acc + r.totale_rotto, 0)

  return (
    <main className="min-h-screen bg-[#f4f7fb]">
      <section className="mx-auto w-full max-w-[1600px] p-4 lg:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-950 sm:text-5xl">
            Estrazioni prodotti
          </h1>

          <p className="mt-2 text-base font-bold text-slate-700 sm:text-2xl">
            Analisi ordini e prodotti rotti
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-4">
          <select
            value={localeId}
            onChange={(e) => setLocaleId(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 shadow outline-none focus:border-blue-600"
          >
            <option value="">Tutti i locali</option>

            {locali.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <select
            value={prodotto}
            onChange={(e) => setProdotto(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 shadow outline-none focus:border-blue-600"
          >
            <option value="">Seleziona prodotto</option>

            {prodotti.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dal}
            onChange={(e) => setDal(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 shadow outline-none focus:border-blue-600"
          />

          <input
            type="date"
            value={al}
            onChange={(e) => setAl(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 shadow outline-none focus:border-blue-600"
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-base font-bold text-slate-700">
              Totale ordinato
            </p>

            <h2 className="mt-2 text-4xl font-black text-slate-950">
              {totaleOrdinato}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-base font-bold text-slate-700">
              Totale consegnato
            </p>

            <h2 className="mt-2 text-4xl font-black text-slate-950">
              {totaleConsegnato}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-base font-bold text-slate-700">
              Totale rotto stimato
            </p>

            <h2 className="mt-2 text-4xl font-black text-red-600">
              {totaleRotto}
            </h2>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow">
          <div className="hidden grid-cols-4 bg-[#07132b] p-4 text-sm font-bold uppercase text-white md:grid">
            <div>Locale</div>
            <div>Prodotto</div>
            <div>Ordinato</div>
            <div>Rotto</div>
          </div>

          <div className="divide-y divide-slate-100">
            {risultati.map((r, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 p-4 text-sm font-bold text-slate-900 md:grid-cols-4"
              >
                <div>
                  <span className="text-xs uppercase text-slate-500 md:hidden">
                    Locale
                  </span>
                  <p>{r.locale}</p>
                </div>

                <div>
                  <span className="text-xs uppercase text-slate-500 md:hidden">
                    Prodotto
                  </span>
                  <p>{r.prodotto}</p>
                </div>

                <div>
                  <span className="text-xs uppercase text-slate-500 md:hidden">
                    Ordinato
                  </span>
                  <p>{r.totale_ordinato}</p>
                </div>

                <div>
                  <span className="text-xs uppercase text-slate-500 md:hidden">
                    Rotto
                  </span>
                  <p className="font-black text-red-600">
                    {r.totale_rotto}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {risultati.length === 0 && (
            <div className="p-8 text-center text-base font-bold text-slate-600">
              Nessun dato trovato
            </div>
          )}
        </div>
      </section>
    </main>
  )
}