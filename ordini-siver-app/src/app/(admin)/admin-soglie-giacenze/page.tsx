"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"

type RigaSoglia = {
  prodotto_id: string
  supplier_code: string | null
  nome_prodotto: string
  active: boolean
  min_stock: number | string
  max_stock: number | string
}

export default function AdminSoglieGiacenze() {
  const { showToast } = useToast()

  const [locali, setLocali] = useState<any[]>([])
  const [localeId, setLocaleId] = useState("")
  const [righe, setRighe] = useState<RigaSoglia[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [ricerca, setRicerca] = useState("")
  const [filtroStato, setFiltroStato] = useState("tutti")
  const [filtroSoglia, setFiltroSoglia] = useState("tutte")
  const [ordinamento, setOrdinamento] = useState("codice")

  useEffect(() => {
    caricaLocali()
  }, [])

  async function caricaLocali() {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name")
      .order("name")

    if (error) {
      console.log("Errore caricamento locali:", error)
      showToast("Errore caricamento locali", "error")
      return
    }

    setLocali(data || [])
  }

  async function caricaSoglie(id: string) {
    setLocaleId(id)
    setRighe([])
    setRicerca("")
    setFiltroStato("tutti")
    setFiltroSoglia("tutte")
    setOrdinamento("codice")

    if (!id) return

    setLoading(true)

    const { data: prodotti, error: errorProdotti } = await supabase
      .from("products")
      .select("id, name, active, supplier_code")
      .eq("active", true)
      .order("supplier_code")

    if (errorProdotti) {
      console.log("Errore caricamento prodotti:", errorProdotti)
      showToast("Errore caricamento prodotti", "error")
      setLoading(false)
      return
    }

    const prodottiUnici = Object.values(
      (prodotti || []).reduce((acc: any, prodotto: any) => {
        const codice = prodotto.supplier_code || prodotto.id

        if (!acc[codice]) {
          acc[codice] = prodotto
        }

        return acc
      }, {})
    )

    const { data: impostazioni, error: errorSoglie } = await supabase
      .from("restaurant_product_settings")
      .select("*")
      .eq("restaurant_id", id)

    if (errorSoglie) {
      console.log("Errore caricamento soglie:", errorSoglie)
      showToast("Errore caricamento soglie", "error")
      setLoading(false)
      return
    }

    const righeComplete = prodottiUnici.map((prodotto: any) => {
      const esistente = (impostazioni || []).find(
        (item) => item.prodotto_id === prodotto.id
      )

      return {
        prodotto_id: prodotto.id,
        supplier_code: prodotto.supplier_code,
        nome_prodotto: prodotto.name,
        active: esistente?.active ?? false,
        min_stock: esistente?.min_stock ?? 0,
        max_stock: esistente?.max_stock ?? 0,
      }
    })

    setRighe(righeComplete)
    setLoading(false)
  }

  const righeFiltrate = useMemo(() => {
    const q = ricerca.toLowerCase().trim()

    return [...righe]
      .filter((riga) => {
        const matchRicerca =
          !q ||
          String(riga.nome_prodotto || "").toLowerCase().includes(q) ||
          String(riga.supplier_code || "").toLowerCase().includes(q)

        const haSoglia =
          Number(riga.min_stock || 0) > 0 || Number(riga.max_stock || 0) > 0

        const matchStato =
          filtroStato === "tutti" ||
          (filtroStato === "attive" && riga.active) ||
          (filtroStato === "disattive" && !riga.active)

        const matchSoglia =
          filtroSoglia === "tutte" ||
          (filtroSoglia === "con-soglia" && haSoglia) ||
          (filtroSoglia === "senza-soglia" && !haSoglia) ||
          (filtroSoglia === "modificati" && (riga.active || haSoglia))

        return matchRicerca && matchStato && matchSoglia
      })
      .sort((a, b) => {
        if (ordinamento === "nome") {
          return String(a.nome_prodotto || "").localeCompare(
            String(b.nome_prodotto || "")
          )
        }

        if (ordinamento === "minima") {
          return Number(b.min_stock || 0) - Number(a.min_stock || 0)
        }

        if (ordinamento === "massima") {
          return Number(b.max_stock || 0) - Number(a.max_stock || 0)
        }

        return String(a.supplier_code || "").localeCompare(
          String(b.supplier_code || "")
        )
      })
  }, [righe, ricerca, filtroStato, filtroSoglia, ordinamento])

  function aggiornaRiga(prodottoId: string, campo: string, valore: any) {
    setRighe((righeAttuali) =>
      righeAttuali.map((riga) =>
        riga.prodotto_id === prodottoId
          ? {
              ...riga,
              [campo]: valore,
            }
          : riga
      )
    )
  }

  async function salvaSoglie() {
    if (!localeId) {
      showToast("Seleziona prima un locale", "warning")
      return
    }

    setIsSaving(true)

    for (const riga of righe) {
      const payload = {
        restaurant_id: localeId,
        prodotto_id: riga.prodotto_id,
        min_stock: Number(riga.min_stock || 0),
        max_stock: Number(riga.max_stock || 0),
        active: riga.active,
      }

      const { data: esistente, error: erroreRicerca } = await supabase
        .from("restaurant_product_settings")
        .select("id")
        .eq("restaurant_id", localeId)
        .eq("prodotto_id", riga.prodotto_id)
        .limit(1)

      if (erroreRicerca) {
        console.log("Errore ricerca soglia:", erroreRicerca)
        showToast("Errore ricerca soglia", "error")
        setIsSaving(false)
        return
      }

      if (esistente && esistente.length > 0) {
        const { error } = await supabase
          .from("restaurant_product_settings")
          .update(payload)
          .eq("id", esistente[0].id)

        if (error) {
          console.log("Errore aggiornamento soglia:", error)
          showToast("Errore aggiornamento soglia", "error")
          setIsSaving(false)
          return
        }
      } else {
        const { error } = await supabase
          .from("restaurant_product_settings")
          .insert(payload)

        if (error) {
          console.log("Errore inserimento soglia:", error)
          showToast("Errore inserimento soglia", "error")
          setIsSaving(false)
          return
        }
      }
    }

    showToast("Soglie salvate correttamente", "success")
    setIsSaving(false)
    caricaSoglie(localeId)
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-24 pt-4 sm:px-5 sm:pb-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                OrdiniSiver
              </h1>

              <p className="mt-0.5 text-xs font-medium text-slate-300">
                Admin · Soglie giacenze
              </p>
            </div>

            <button
              onClick={logout}
              disabled={isSaving}
              className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-500"
            >
              Logout
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => (window.location.href = "/admin-dashboard")}
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-500"
            >
              Home Admin
            </button>

            <button
              onClick={() => window.history.back()}
              disabled={isSaving}
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-500"
            >
              Indietro
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            Soglie giacenze per locale
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
            I prodotti duplicati vengono raggruppati tramite supplier_code.
          </p>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <select
            value={localeId}
            onChange={(e) => caricaSoglie(e.target.value)}
            disabled={isSaving || loading}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none disabled:bg-slate-200"
          >
            <option value="">Seleziona locale</option>

            {locali.map((locale) => (
              <option key={locale.id} value={locale.id}>
                {locale.name}
              </option>
            ))}
          </select>

          <div className="grid gap-3 lg:grid-cols-[1.4fr_180px_210px_180px]">
            <input
              type="search"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca codice o prodotto..."
              disabled={!localeId || isSaving || loading}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none placeholder:text-slate-400 disabled:bg-slate-200"
            />

            <select
              value={filtroStato}
              onChange={(e) => setFiltroStato(e.target.value)}
              disabled={!localeId || isSaving || loading}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none disabled:bg-slate-200"
            >
              <option value="tutti">Tutti gli stati</option>
              <option value="attive">Solo attive</option>
              <option value="disattive">Solo disattive</option>
            </select>

            <select
              value={filtroSoglia}
              onChange={(e) => setFiltroSoglia(e.target.value)}
              disabled={!localeId || isSaving || loading}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none disabled:bg-slate-200"
            >
              <option value="tutte">Tutte le soglie</option>
              <option value="con-soglia">Con soglia impostata</option>
              <option value="senza-soglia">Senza soglia</option>
              <option value="modificati">Solo configurati</option>
            </select>

            <select
              value={ordinamento}
              onChange={(e) => setOrdinamento(e.target.value)}
              disabled={!localeId || isSaving || loading}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none disabled:bg-slate-200"
            >
              <option value="codice">Ordina per codice</option>
              <option value="nome">Ordina per nome</option>
              <option value="minima">Minima più alta</option>
              <option value="massima">Massima più alta</option>
            </select>
          </div>

          {localeId && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
              <span>
                Visualizzati {righeFiltrate.length} prodotti su {righe.length}
              </span>

              <button
                type="button"
                onClick={() => {
                  setRicerca("")
                  setFiltroStato("tutti")
                  setFiltroSoglia("tutte")
                  setOrdinamento("codice")
                }}
                disabled={isSaving || loading}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
              >
                Reset filtri
              </button>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-center text-sm font-bold text-slate-500">
              Caricamento prodotti...
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[120px_1fr_100px_130px_130px] bg-slate-950 text-[11px] font-bold uppercase tracking-wide text-white md:grid">
                <div className="px-3 py-2.5">Codice</div>
                <div className="px-3 py-2.5">Prodotto</div>
                <div className="px-3 py-2.5">Attivo</div>
                <div className="px-3 py-2.5">Minima</div>
                <div className="px-3 py-2.5">Massima</div>
              </div>

              {righeFiltrate.map((riga, index) => (
                <div
                  key={`${riga.prodotto_id}-${index}`}
                  className={`grid grid-cols-1 gap-2 border-b border-slate-100 px-3 py-3 last:border-b-0 md:grid-cols-[120px_1fr_100px_130px_130px] md:items-center md:gap-0 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-bold text-slate-500">
                    {riga.supplier_code || "-"}
                  </div>

                  <div className="text-sm font-bold text-slate-950">
                    {riga.nome_prodotto}
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={riga.active}
                      disabled={isSaving}
                      onChange={(e) =>
                        aggiornaRiga(
                          riga.prodotto_id,
                          "active",
                          e.target.checked
                        )
                      }
                    />

                    Attivo
                  </label>

                  <input
                    type="number"
                    value={riga.min_stock}
                    disabled={isSaving}
                    onChange={(e) =>
                      aggiornaRiga(riga.prodotto_id, "min_stock", e.target.value)
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 disabled:bg-slate-200"
                  />

                  <input
                    type="number"
                    value={riga.max_stock}
                    disabled={isSaving}
                    onChange={(e) =>
                      aggiornaRiga(riga.prodotto_id, "max_stock", e.target.value)
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 disabled:bg-slate-200"
                  />
                </div>
              ))}

              {!localeId && (
                <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  Seleziona un locale per configurare le soglie.
                </div>
              )}

              {localeId && righe.length > 0 && righeFiltrate.length === 0 && (
                <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  Nessun prodotto corrisponde ai filtri selezionati.
                </div>
              )}

              {localeId && righe.length === 0 && (
                <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  Nessun prodotto trovato.
                </div>
              )}
            </>
          )}
        </section>

        <button
          onClick={salvaSoglie}
          disabled={!localeId || righe.length === 0 || isSaving || loading}
          className="hidden h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-5 text-base font-bold text-white disabled:bg-slate-400 sm:flex"
        >
          {isSaving ? "Salvataggio..." : "Salva soglie"}
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:hidden">
        <button
          onClick={salvaSoglie}
          disabled={!localeId || righe.length === 0 || isSaving || loading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-5 text-base font-bold text-white disabled:bg-slate-400"
        >
          {isSaving ? "Salvataggio..." : "Salva soglie"}
        </button>
      </div>
    </main>
  )
}