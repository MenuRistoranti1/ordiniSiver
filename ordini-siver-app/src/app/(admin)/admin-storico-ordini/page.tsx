"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Ordine = {
  id: string
  locale_id: string | null
  locale_nome: string | null
  responsabile: string | null
  nome_prodotto: string
  supplier_code?: string | null
  misure?: string | null
  quantita: number
  settimana_key?: string | null
  created_at: string
}

type Locale = {
  id: string
  name: string
}

type GruppoOrdine = {
  key: string
  titolo: string
  locale_id: string | null
  locale_nome: string
  settimana: string
  responsabile: string
  created_at: string | null
  prodotti: Ordine[]
  totale: number
}

export default function AdminStoricoOrdini() {
  const [ordini, setOrdini] = useState<Ordine[]>([])
  const [locali, setLocali] = useState<Locale[]>([])
  const [gruppiAperti, setGruppiAperti] = useState<Record<string, boolean>>({})
  const [ricerca, setRicerca] = useState("")
  const [localeFiltro, setLocaleFiltro] = useState("tutti")
  const [ordinamento, setOrdinamento] = useState("data")
  const [loading, setLoading] = useState(true)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  useEffect(() => {
    caricaDati()
  }, [])

  async function caricaDati() {
    setLoading(true)

    const [{ data: localiDb }, { data: ordiniDb, error }] = await Promise.all([
      supabase.from("restaurants").select("id, name").order("name"),
      supabase
        .from("ordini")
        .select("*")
        .order("created_at", { ascending: false })
        .order("locale_nome", { ascending: true })
        .order("nome_prodotto", { ascending: true }),
    ])

    if (error) {
      console.log(error)
      alert("Errore caricamento ordini")
      setLoading(false)
      return
    }

    setLocali((localiDb || []) as Locale[])
    setOrdini((ordiniDb || []) as Ordine[])
    setLoading(false)
  }

  function dataIt(value?: string | null) {
    if (!value) return "Senza data"
    return new Date(value).toLocaleDateString("it-IT")
  }

  function dataOraIt(value?: string | null) {
    if (!value) return "-"
    return new Date(value).toLocaleString("it-IT")
  }

  const ordiniFiltrati = useMemo(() => {
    let lista = [...ordini]

    if (localeFiltro !== "tutti") {
      lista = lista.filter((ordine) => String(ordine.locale_id || "") === localeFiltro)
    }

    if (ricerca.trim()) {
      const q = ricerca.toLowerCase()

      lista = lista.filter((ordine) =>
        [
          ordine.nome_prodotto,
          ordine.supplier_code,
          ordine.locale_nome,
          ordine.responsabile,
          ordine.settimana_key,
          ordine.misure,
        ]
          .filter(Boolean)
          .some((valore) => String(valore).toLowerCase().includes(q))
      )
    }

    return lista
  }, [ordini, ricerca, localeFiltro])

  const gruppi = useMemo(() => {
    const map = new Map<string, Ordine[]>()

    ordiniFiltrati.forEach((item) => {
      const settimana =
        item.settimana_key || item.created_at?.split("T")[0] || "Senza data"
      const localeId = item.locale_id || "no-locale"
      const responsabile = item.responsabile || "Senza responsabile"
      const key = `${localeId}__${settimana}__${responsabile}`

      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })

    const gruppati: GruppoOrdine[] = Array.from(map.entries()).map(
      ([key, prodotti]) => {
        const primo = prodotti[0]
        const settimana =
          primo.settimana_key || primo.created_at?.split("T")[0] || "Senza data"

        return {
          key,
          titolo: `${primo.locale_nome || "Locale non indicato"} - ${
            settimana !== "Senza data" ? dataIt(settimana) : settimana
          }`,
          locale_id: primo.locale_id,
          locale_nome: primo.locale_nome || "Locale non indicato",
          settimana,
          responsabile: primo.responsabile || "Senza responsabile",
          created_at: primo.created_at || null,
          prodotti,
          totale: prodotti.reduce(
            (sum, item) => sum + Number(item.quantita || 0),
            0
          ),
        }
      }
    )

    return gruppati.sort((a, b) => {
      if (ordinamento === "locale") {
        return String(a.locale_nome).localeCompare(String(b.locale_nome))
      }

      if (ordinamento === "prodotti") {
        return b.prodotti.length - a.prodotti.length
      }

      if (ordinamento === "quantita") {
        return b.totale - a.totale
      }

      return String(b.settimana).localeCompare(String(a.settimana))
    })
  }, [ordiniFiltrati, ordinamento])

  const totaleQuantita = useMemo(() => {
    return ordiniFiltrati.reduce(
      (sum, item) => sum + Number(item.quantita || 0),
      0
    )
  }, [ordiniFiltrati])

  const localiCoinvolti = useMemo(() => {
    return new Set(ordiniFiltrati.map((ordine) => ordine.locale_id).filter(Boolean))
      .size
  }, [ordiniFiltrati])

  function toggleGruppo(key: string) {
    setGruppiAperti((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  async function eliminaGruppo(gruppo: GruppoOrdine) {
    const conferma = window.confirm(
      `Vuoi eliminare questo ordine?\n\n${gruppo.titolo}\nResponsabile: ${gruppo.responsabile}\n\nVerranno eliminate ${gruppo.prodotti.length} righe. Il locale potrà reinviare l'ordine.`
    )

    if (!conferma) return

    setDeletingKey(gruppo.key)

    const ids = gruppo.prodotti.map((ordine) => ordine.id)

    const { error } = await supabase.from("ordini").delete().in("id", ids)

    if (error) {
      console.log(error)
      alert("Errore eliminazione ordine")
      setDeletingKey(null)
      return
    }

    setOrdini((attuali) => attuali.filter((ordine) => !ids.includes(ordine.id)))
    setDeletingKey(null)
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-blue-600">
            Operativo
          </p>
          <h1 className="text-5xl font-black tracking-tight text-slate-950">
            Storico ordini
          </h1>
          <p className="mt-2 text-xl font-bold text-slate-500">
            Consulta ed elimina gli ordini inviati dai locali.
          </p>
        </div>

        <button
          onClick={caricaDati}
          disabled={loading}
          className="inline-flex h-16 items-center justify-center gap-3 rounded-3xl bg-blue-600 px-8 text-lg font-black text-white shadow-sm disabled:bg-slate-400"
        >
          <RefreshCw className={`h-7 w-7 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Ordini
          </p>
          <p className="mt-2 text-4xl font-black text-slate-950">
            {gruppi.length}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Invii raggruppati
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Locali
          </p>
          <p className="mt-2 text-4xl font-black text-slate-950">
            {localiCoinvolti}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Locali con ordini
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Quantità totali
          </p>
          <p className="mt-2 text-4xl font-black text-slate-950">
            {totaleQuantita}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Pezzi complessivi
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_280px_280px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca prodotto, codice, locale, responsabile..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
            />
          </div>

          <select
            value={localeFiltro}
            onChange={(e) => setLocaleFiltro(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
          >
            <option value="tutti">Tutti i locali</option>
            {locali.map((locale) => (
              <option key={locale.id} value={locale.id}>
                {locale.name}
              </option>
            ))}
          </select>

          <select
            value={ordinamento}
            onChange={(e) => setOrdinamento(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
          >
            <option value="data">Ordina per settimana</option>
            <option value="locale">Ordina per locale</option>
            <option value="prodotti">Ordina per numero prodotti</option>
            <option value="quantita">Ordina per quantità totale</option>
          </select>
        </div>
      </section>

      {loading ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-black text-slate-500">
          Caricamento storico ordini...
        </section>
      ) : (
        <section className="space-y-4">
          {gruppi.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-sm font-bold text-slate-500">
                Nessun ordine trovato.
              </p>
            </div>
          )}

          {gruppi.map((gruppo) => {
            const aperto = gruppiAperti[gruppo.key]
            const eliminando = deletingKey === gruppo.key

            return (
              <div
                key={gruppo.key}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50">
                  <button
                    onClick={() => toggleGruppo(gruppo.key)}
                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                  >
                    {aperto ? (
                      <ChevronDown className="h-7 w-7 shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-7 w-7 shrink-0 text-slate-500" />
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-3xl font-black text-slate-950">
                        {gruppo.titolo}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-sm font-black">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                          <ClipboardList className="mr-1 inline h-4 w-4" />
                          {gruppo.prodotti.length} prodotti
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                          {gruppo.totale} pezzi
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                          {gruppo.responsabile}
                        </span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                          {dataOraIt(gruppo.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="hidden text-right md:block">
                      <div className="text-sm font-bold text-slate-500">
                        Totale quantità
                      </div>
                      <div className="text-4xl font-black text-slate-950">
                        {gruppo.totale}
                      </div>
                    </div>

                    <button
                      onClick={() => eliminaGruppo(gruppo)}
                      disabled={eliminando}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-3xl bg-red-600 px-6 text-base font-black text-white hover:bg-red-700 disabled:bg-slate-400"
                    >
                      <Trash2 className="h-5 w-5" />
                      {eliminando ? "Elimino..." : "Elimina ordine"}
                    </button>
                  </div>
                </div>

                {aperto && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-4">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="hidden grid-cols-[140px_1fr_130px_180px_200px] bg-slate-950 text-[11px] font-black uppercase tracking-wide text-white md:grid">
                        <div className="px-4 py-3">Codice</div>
                        <div className="px-4 py-3">Prodotto</div>
                        <div className="px-4 py-3 text-right">Quantità</div>
                        <div className="px-4 py-3">Misure</div>
                        <div className="px-4 py-3">Data invio</div>
                      </div>

                      {gruppo.prodotti.map((ordine, index) => (
                        <div
                          key={ordine.id}
                          className={`grid grid-cols-1 gap-2 border-b border-slate-100 px-4 py-4 last:border-b-0 md:grid-cols-[140px_1fr_130px_180px_200px] md:items-center md:gap-0 ${
                            index % 2 === 0 ? "bg-white" : "bg-slate-50"
                          }`}
                        >
                          <div className="text-xs font-black text-slate-500">
                            {ordine.supplier_code || "-"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">
                              {ordine.nome_prodotto}
                            </p>
                            {!ordine.supplier_code && (
                              <p className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                                Fuori lista / fuori anagrafica
                              </p>
                            )}
                          </div>

                          <div className="text-right text-lg font-black text-blue-700">
                            {ordine.quantita}
                          </div>

                          <div className="text-xs font-bold text-slate-500">
                            {ordine.misure || "-"}
                          </div>

                          <div className="text-xs font-bold text-slate-500">
                            {dataOraIt(ordine.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}
    </main>
  )
}