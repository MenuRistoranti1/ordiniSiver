"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, RefreshCw, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Giacenza = {
  id: string
  locale_id: string | null
  locale_nome: string | null
  nome_prodotto: string
  quantita: number
  created_at: string
  settimana_key?: string | null
}

export default function AdminGiacenze() {
  const [giacenze, setGiacenze] = useState<Giacenza[]>([])
  const [aperti, setAperti] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  useEffect(() => {
    caricaGiacenze()
  }, [])

  async function caricaGiacenze() {
    setLoading(true)

    const { data, error } = await supabase
      .from("giacenze_settimana")
      .select("*")
      .order("created_at", { ascending: false })
      .order("locale_nome", { ascending: true })
      .order("nome_prodotto", { ascending: true })

    if (error) {
      console.log(error)
      alert("Errore caricamento giacenze")
      setLoading(false)
      return
    }

    setGiacenze(data || [])
    setLoading(false)
  }

  function formatData(value: string) {
    return new Date(value).toLocaleDateString("it-IT")
  }

  const gruppi = useMemo(() => {
    const map = new Map<string, Giacenza[]>()

    giacenze.forEach((item) => {
      const data = item.settimana_key || item.created_at?.split("T")[0] || "Senza data"
      const locale = item.locale_nome || "Locale non indicato"
      const key = `${item.locale_id || "no-locale"}__${data}`

      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })

    return Array.from(map.entries()).map(([key, items]) => {
      const primo = items[0]
      const dataLabel = primo.settimana_key
        ? new Date(primo.settimana_key).toLocaleDateString("it-IT")
        : formatData(primo.created_at)

      return {
        key,
        titolo: `${primo.locale_nome || "Locale non indicato"} - ${dataLabel}`,
        locale_id: primo.locale_id,
        data: primo.settimana_key || primo.created_at?.split("T")[0],
        items,
        totale: items.reduce((sum, i) => sum + Number(i.quantita || 0), 0),
      }
    })
  }, [giacenze])

  function toggle(key: string) {
    setAperti((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  async function eliminaGruppo(gruppo: {
    key: string
    titolo: string
    items: Giacenza[]
  }) {
    const conferma = window.confirm(
      `Vuoi eliminare l'invio giacenze?\n\n${gruppo.titolo}\n\nVerranno eliminate ${gruppo.items.length} righe. Il locale potrà reinserire le giacenze.`
    )

    if (!conferma) return

    setDeletingKey(gruppo.key)

    const ids = gruppo.items.map((item) => item.id)

    const { error } = await supabase
      .from("giacenze_settimana")
      .delete()
      .in("id", ids)

    if (error) {
      console.log(error)
      alert("Errore eliminazione giacenze")
      setDeletingKey(null)
      return
    }

    setGiacenze((attuali) => attuali.filter((item) => !ids.includes(item.id)))
    setDeletingKey(null)
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-blue-600">
            Operativo
          </p>
          <h1 className="text-4xl font-black text-slate-950">
            Giacenze
          </h1>
          <p className="text-lg font-semibold text-slate-500">
            Riepilogo invii per locale e settimana
          </p>
        </div>

        <button
          onClick={caricaGiacenze}
          disabled={loading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:bg-slate-400"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </button>
      </div>

      <div className="space-y-4">
        {gruppi.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center font-bold text-slate-500">
            Nessuna giacenza trovata.
          </div>
        ) : (
          gruppi.map((gruppo) => {
            const aperto = aperti[gruppo.key]
            const eliminando = deletingKey === gruppo.key

            return (
              <div
                key={gruppo.key}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50">
                  <button
                    onClick={() => toggle(gruppo.key)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {aperto ? (
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-xl font-black text-slate-950">
                        {gruppo.titolo}
                      </div>
                      <div className="text-sm font-bold text-slate-500">
                        {gruppo.items.length} prodotti inseriti
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <div className="text-sm font-bold text-slate-500">
                        Totale quantità
                      </div>
                      <div className="text-2xl font-black text-slate-950">
                        {gruppo.totale}
                      </div>
                    </div>

                    <button
                      onClick={() => eliminaGruppo(gruppo)}
                      disabled={eliminando}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-black text-white hover:bg-red-700 disabled:bg-slate-400"
                    >
                      <Trash2 className="h-4 w-4" />
                      {eliminando ? "Elimino..." : "Elimina invio"}
                    </button>
                  </div>
                </div>

                {aperto && (
                  <div className="border-t border-slate-100">
                    {gruppo.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[1fr_120px] gap-4 border-b border-slate-100 p-4 last:border-b-0"
                      >
                        <div className="font-bold text-slate-800">
                          {item.nome_prodotto}
                        </div>

                        <div className="text-right font-black text-slate-950">
                          {item.quantita}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}