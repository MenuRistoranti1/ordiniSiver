"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"

export default function AdminSoglieGiacenze() {
  const { showToast } = useToast()

  const [locali, setLocali] = useState<any[]>([])
  const [localeId, setLocaleId] = useState("")
  const [righe, setRighe] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

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

  function aggiornaRiga(index: number, campo: string, valore: any) {
    const nuove = [...righe]

    nuove[index] = {
      ...nuove[index],
      [campo]: valore,
    }

    setRighe(nuove)
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

  function logout() {
    localStorage.removeItem("admin")
    window.location.href = "/"
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

              {righe.map((riga, index) => (
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
                        aggiornaRiga(index, "active", e.target.checked)
                      }
                    />

                    Attivo
                  </label>

                  <input
                    type="number"
                    value={riga.min_stock}
                    disabled={isSaving}
                    onChange={(e) =>
                      aggiornaRiga(index, "min_stock", e.target.value)
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 disabled:bg-slate-200"
                  />

                  <input
                    type="number"
                    value={riga.max_stock}
                    disabled={isSaving}
                    onChange={(e) =>
                      aggiornaRiga(index, "max_stock", e.target.value)
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