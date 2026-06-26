"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"

export default function StoricoGiacenze() {
  const { showToast } = useToast()

  const [giacenze, setGiacenze] = useState<any[]>([])
  const [soglie, setSoglie] = useState<any[]>([])
  const [localeNome, setLocaleNome] = useState("")
  const [localeId, setLocaleId] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [gruppoAperto, setGruppoAperto] = useState<string | null>(null)
  const [modificaAperta, setModificaAperta] = useState<string | null>(null)
  const [quantitaModificate, setQuantitaModificate] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [ricerca, setRicerca] = useState("")
  const [filtroStato, setFiltroStato] = useState("tutti")
  const [ordinamento, setOrdinamento] = useState("nome")

  useEffect(() => {
    inizializzaPagina()
  }, [])

  async function inizializzaPagina() {
    setLoading(true)

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      window.location.href = "/"
      return
    }

    const ruolo = user.app_metadata?.role

    if (ruolo === "admin") {
      const params = new URLSearchParams(window.location.search)
      const idDaUrl = params.get("locale_id") || ""
      const nomeDaUrl = params.get("locale_nome") || "Locale selezionato"

      setIsAdmin(true)

      if (!idDaUrl) {
        showToast("Seleziona prima un locale", "warning")
        window.location.href = "/admin-dashboard"
        return
      }

      setLocaleId(idDaUrl)
      setLocaleNome(nomeDaUrl)
      await caricaDati(idDaUrl)
      setLoading(false)
      return
    }

    if (ruolo !== "locale") {
      await supabase.auth.signOut()
      window.location.href = "/"
      return
    }

    const id = String(user.app_metadata?.locale_id || "")
    const nome = String(user.app_metadata?.locale_nome || "")

    if (!id || !nome) {
      await supabase.auth.signOut()
      window.location.href = "/"
      return
    }

    setIsAdmin(false)
    setLocaleId(id)
    setLocaleNome(nome)
    await caricaDati(id)
    setLoading(false)
  }

  async function caricaDati(id: string) {
    const { data: giacenzeData, error: giacenzeError } = await supabase
      .from("giacenze_settimana")
      .select("*")
      .eq("locale_id", id)
      .order("settimana_key", { ascending: false })

    if (giacenzeError) {
      console.log(giacenzeError)
      showToast("Errore caricamento storico giacenze", "error")
      return
    }

    const { data: soglieData, error: soglieError } = await supabase
      .from("restaurant_product_settings")
      .select(`
        id,
        min_stock,
        max_stock,
        active,
        prodotto_id,
        product_id,
        products (
          id,
          name,
          supplier_code
        )
      `)
      .eq("restaurant_id", id)

    if (soglieError) {
      console.log(soglieError)
      showToast("Errore caricamento soglie", "error")
    }

    const soglieFormattate = (soglieData || []).map((item: any) => ({
      nome_prodotto: item.products?.name || "",
      supplier_code: item.products?.supplier_code || "",
      min_stock: item.min_stock || 0,
      max_stock: item.max_stock || 0,
      active: item.active,
    }))

    setGiacenze(giacenzeData || [])
    setSoglie(soglieFormattate)
  }

  function getSoglia(nomeProdotto: string) {
    return soglie.find(
      (s) =>
        String(s.nome_prodotto || "").toLowerCase().trim() ===
        String(nomeProdotto || "").toLowerCase().trim()
    )
  }

  function statoSoglia(item: any) {
    const soglia = getSoglia(item.nome_prodotto)
    const qta = Number(item.quantita || 0)
    const min = Number(soglia?.min_stock || 0)
    const max = Number(soglia?.max_stock || 0)

    if (!soglia) return "Senza soglia"
    if (min > 0 && qta < min) return "Sotto soglia"
    if (max > 0 && qta > max) return "Sopra soglia"

    return "Corretto"
  }

  function classeStato(stato: string) {
    if (stato === "Sotto soglia") return "bg-red-100 text-red-700"
    if (stato === "Sopra soglia") return "bg-orange-100 text-orange-700"
    if (stato === "Corretto") return "bg-green-100 text-green-700"

    return "bg-slate-100 text-slate-700"
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("locale_id")
    localStorage.removeItem("locale_nome")
    localStorage.removeItem("restaurant_name")
    window.location.href = "/"
  }

  function tornaHome() {
    if (isAdmin) {
      window.location.href = "/admin-dashboard"
      return
    }

    window.location.href = "/dashboard"
  }

  function apriModifica(gruppo: any) {
    if (!isAdmin) return

    const valori: any = {}

    gruppo.prodotti.forEach((item: any) => {
      valori[item.id] = item.quantita
    })

    setQuantitaModificate(valori)
    setModificaAperta(gruppo.id)
    setGruppoAperto(gruppo.id)
  }

  function aggiornaQuantita(id: string, valore: string) {
    setQuantitaModificate({
      ...quantitaModificate,
      [id]: valore,
    })
  }

  async function salvaModifiche(gruppo: any) {
    if (!isAdmin || isSaving) return

    setIsSaving(true)

    for (const item of gruppo.prodotti) {
      const nuovaQuantita = Number(quantitaModificate[item.id])

      const { error } = await supabase
        .from("giacenze_settimana")
        .update({ quantita: nuovaQuantita })
        .eq("id", item.id)

      if (error) {
        console.log(error)
        setIsSaving(false)
        showToast("Errore salvataggio modifiche", "error")
        return
      }
    }

    showToast("Giacenza modificata correttamente", "success")
    setModificaAperta(null)
    setIsSaving(false)
    await caricaDati(localeId)
  }

  const gruppi = useMemo(() => {
    const gruppati = Object.values(
      giacenze.reduce((acc: any, item: any) => {
        const data =
          item.settimana_key ||
          item.data_inserimento ||
          item.created_at?.split("T")[0]

        const responsabile = item.responsabile || "Senza responsabile"
        const chiave = `${data}-${responsabile}`

        if (!acc[chiave]) {
          acc[chiave] = {
            id: chiave,
            data,
            responsabile,
            prodotti: [],
          }
        }

        acc[chiave].prodotti.push(item)
        return acc
      }, {})
    ) as any[]

    return gruppati.sort((a, b) => String(b.data).localeCompare(String(a.data)))
  }, [giacenze])

  const gruppiFiltrati = useMemo(() => {
    const q = ricerca.toLowerCase().trim()

    return gruppi
      .map((gruppo: any) => {
        let prodotti = [...gruppo.prodotti]

        if (q) {
          prodotti = prodotti.filter((item: any) =>
            String(item.nome_prodotto || "").toLowerCase().includes(q)
          )
        }

        if (filtroStato !== "tutti") {
          prodotti = prodotti.filter(
            (item: any) => statoSoglia(item) === filtroStato
          )
        }

        if (ordinamento === "nome") {
          prodotti.sort((a: any, b: any) =>
            String(a.nome_prodotto || "").localeCompare(
              String(b.nome_prodotto || "")
            )
          )
        }

        if (ordinamento === "quantita") {
          prodotti.sort(
            (a: any, b: any) => Number(b.quantita || 0) - Number(a.quantita || 0)
          )
        }

        if (ordinamento === "stato") {
          const peso: any = {
            "Sotto soglia": 1,
            Corretto: 2,
            "Sopra soglia": 3,
            "Senza soglia": 4,
          }

          prodotti.sort((a: any, b: any) => peso[statoSoglia(a)] - peso[statoSoglia(b)])
        }

        return {
          ...gruppo,
          prodotti,
        }
      })
      .filter((gruppo: any) => gruppo.prodotti.length > 0)
  }, [gruppi, ricerca, filtroStato, ordinamento, soglie])

  function riepilogoGruppo(gruppo: any) {
    const sotto = gruppo.prodotti.filter(
      (p: any) => statoSoglia(p) === "Sotto soglia"
    ).length

    const corretto = gruppo.prodotti.filter(
      (p: any) => statoSoglia(p) === "Corretto"
    ).length

    const sopra = gruppo.prodotti.filter(
      (p: any) => statoSoglia(p) === "Sopra soglia"
    ).length

    return { sotto, corretto, sopra }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <LocaleMobileHeader />

        <section className="hidden rounded-2xl bg-slate-950 p-4 text-white shadow-lg lg:block">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                OrdiniSiver
              </h1>

              <p className="mt-0.5 text-xs font-medium text-slate-300">
                Storico giacenze · {localeNome || "Caricamento..."}
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
              onClick={tornaHome}
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-500"
            >
              Home
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
          <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">
            Storico giacenze
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            Consulta quantità, min/max e stato soglia.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="Cerca prodotto..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
          />

          <select
            value={filtroStato}
            onChange={(e) => setFiltroStato(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
          >
            <option value="tutti">Tutti gli stati</option>
            <option value="Sotto soglia">Sotto soglia</option>
            <option value="Corretto">Corretto</option>
            <option value="Sopra soglia">Sopra soglia</option>
            <option value="Senza soglia">Senza soglia</option>
          </select>

          <select
            value={ordinamento}
            onChange={(e) => setOrdinamento(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
          >
            <option value="nome">Ordina per nome</option>
            <option value="quantita">Ordina per quantità</option>
            <option value="stato">Ordina per stato soglia</option>
          </select>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">
            Caricamento storico...
          </section>
        ) : (
          <section className="space-y-3">
            {gruppiFiltrati.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-600">
                  Nessuna giacenza trovata.
                </p>
              </div>
            )}

            {gruppiFiltrati.map((gruppo: any) => {
              const riepilogo = riepilogoGruppo(gruppo)

              return (
                <div
                  key={gruppo.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-3 p-4">
                    <button
                      onClick={() =>
                        setGruppoAperto(
                          gruppoAperto === gruppo.id ? null : gruppo.id
                        )
                      }
                      className="text-left"
                    >
                      <h3 className="text-lg font-black text-slate-950">
                        Giacenza · {gruppo.data || "-"}
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        Responsabile: {gruppo.responsabile}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-lg bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                          Sotto: {riepilogo.sotto}
                        </span>

                        <span className="rounded-lg bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                          Corretti: {riepilogo.corretto}
                        </span>

                        <span className="rounded-lg bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                          Sopra: {riepilogo.sopra}
                        </span>
                      </div>
                    </button>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {isAdmin && (
                        <button
                          onClick={() => apriModifica(gruppo)}
                          className="h-12 rounded-xl bg-amber-100 text-sm font-black text-amber-800"
                        >
                          Modifica
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setGruppoAperto(
                            gruppoAperto === gruppo.id ? null : gruppo.id
                          )
                        }
                        className="h-12 rounded-xl bg-slate-950 text-sm font-black text-white"
                      >
                        {gruppoAperto === gruppo.id ? "Chiudi" : "Apri"}
                      </button>
                    </div>
                  </div>

                  {gruppoAperto === gruppo.id && (
                    <div className="space-y-3 border-t border-slate-100 bg-slate-50 p-3">
                      {gruppo.prodotti.map((item: any, index: number) => {
                        const soglia = getSoglia(item.nome_prodotto)
                        const stato = statoSoglia(item)

                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl border border-slate-200 p-4 ${
                              index % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }`}
                          >
                            <h4 className="text-base font-black text-slate-950">
                              {item.nome_prodotto}
                            </h4>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                                Quantità: {item.quantita}
                              </span>

                              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                Min/Max:{" "}
                                {soglia
                                  ? `${soglia.min_stock}/${soglia.max_stock}`
                                  : "-"}
                              </span>

                              <span
                                className={`rounded-lg px-3 py-1 text-xs font-black ${classeStato(
                                  stato
                                )}`}
                              >
                                {stato}
                              </span>
                            </div>

                            <p className="mt-3 text-xs font-semibold text-slate-500">
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString(
                                    "it-IT"
                                  )
                                : "-"}
                            </p>

                            {isAdmin && modificaAperta === gruppo.id && (
                              <input
                                type="number"
                                value={quantitaModificate[item.id] ?? ""}
                                disabled={isSaving}
                                onChange={(e) =>
                                  aggiornaQuantita(item.id, e.target.value)
                                }
                                className="mt-4 h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-base font-black text-slate-950 outline-none focus:border-blue-600"
                              />
                            )}
                          </div>
                        )
                      })}

                      {isAdmin && modificaAperta === gruppo.id && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            onClick={() => salvaModifiche(gruppo)}
                            disabled={isSaving}
                            className="h-12 rounded-xl bg-green-600 text-sm font-black text-white disabled:bg-slate-400"
                          >
                            {isSaving ? "Salvataggio..." : "Salva modifiche"}
                          </button>

                          <button
                            onClick={() => setModificaAperta(null)}
                            disabled={isSaving}
                            className="h-12 rounded-xl bg-slate-500 text-sm font-black text-white disabled:bg-slate-400"
                          >
                            Annulla
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}