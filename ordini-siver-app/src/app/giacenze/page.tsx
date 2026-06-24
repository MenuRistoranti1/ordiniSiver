"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"

export default function Giacenze() {
  const { showToast } = useToast()

  const [prodotti, setProdotti] = useState<any[]>([])
  const [responsabile, setResponsabile] = useState("")
  const [quantita, setQuantita] = useState<any>({})
  const [localeId, setLocaleId] = useState("")
  const [localeNome, setLocaleNome] = useState("")
  const [blocco, setBlocco] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [ricerca, setRicerca] = useState("")
  const [filtro, setFiltro] = useState("tutti")
  const [ordinamento, setOrdinamento] = useState("nome")

  useEffect(() => {
    const id = localStorage.getItem("locale_id") || ""
    const nome = localStorage.getItem("locale_nome") || ""

    if (!id) {
      window.location.href = "/"
      return
    }

    setLocaleId(id)
    setLocaleNome(nome)

    caricaProdotti(id)
    controllaBloccoGiacenze(id)
  }, [])

  async function caricaProdotti(id: string) {
    setLoading(true)

    const { data: impostazioni, error } = await supabase
      .from("restaurant_product_settings")
      .select("id, active, min_stock, max_stock, prodotto_id, product_id")
      .eq("restaurant_id", id)
      .eq("active", true)

    if (error) {
      console.log(error)
      showToast("Errore caricamento prodotti", "error")
      setLoading(false)
      return
    }

    const idsProdotti = (impostazioni || [])
      .map((item: any) => item.prodotto_id || item.product_id)
      .filter(Boolean)

    if (idsProdotti.length === 0) {
      setProdotti([])
      setLoading(false)
      return
    }

    const { data: prodottiDb, error: errorProdotti } = await supabase
      .from("products")
      .select("id, name, supplier_code, active")
      .in("id", idsProdotti)
      .eq("active", true)

    if (errorProdotti) {
      console.log(errorProdotti)
      showToast("Errore caricamento prodotti", "error")
      setLoading(false)
      return
    }

    const prodottiPuliti = (prodottiDb || []).filter((p: any) => {
      const nome = String(p.name || "").toUpperCase()
      const codice = String(p.supplier_code || "").toUpperCase()

      return (
        !nome.includes("DUPLICATO ARCHIVIATO") &&
        !nome.includes("[DUPLICATO ARCHIVIATO]") &&
        !nome.includes("[ARCHIVIATO]") &&
        !nome.includes("ARCHIVIATO") &&
        !nome.includes("DUPLICATO") &&
        !codice.includes("__DUP__")
      )
    })

    const prodottiFormattati = (impostazioni || [])
      .map((item: any) => {
        const idProdotto = item.prodotto_id || item.product_id

        const prodotto = prodottiPuliti.find(
          (p: any) => String(p.id) === String(idProdotto)
        )

        if (!prodotto) return null

        return {
          id: idProdotto,
          nome_prodotto: prodotto.name || "Prodotto",
          supplier_code: prodotto.supplier_code || "-",
          min_stock: item.min_stock || 0,
          max_stock: item.max_stock || 0,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) =>
        String(a.nome_prodotto || "").localeCompare(String(b.nome_prodotto || ""))
      )

    setProdotti(prodottiFormattati)
    setLoading(false)
  }

  function statoSoglia(prodotto: any) {
    const valore = quantita[prodotto.id]

    if (valore === undefined || valore === "") return "Da compilare"

    const qta = Number(valore)
    const min = Number(prodotto.min_stock || 0)
    const max = Number(prodotto.max_stock || 0)

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

  function sabatoCorrente() {
    const oggi = new Date()
    const giorno = oggi.getDay()
    const diff = giorno >= 6 ? giorno - 6 : giorno + 1
    const sabato = new Date(oggi)

    sabato.setDate(oggi.getDate() - diff)
    sabato.setHours(0, 0, 0, 0)

    return sabato
  }

  function prossimoSabato() {
    const sabato = sabatoCorrente()
    sabato.setDate(sabato.getDate() + 7)
    return sabato
  }

  function getSettimanaKey() {
    return sabatoCorrente().toISOString().split("T")[0]
  }

  async function controllaBloccoGiacenze(id: string) {
    const settimanaKey = getSettimanaKey()
    const prossimo = prossimoSabato().toLocaleDateString("it-IT")

    const { data } = await supabase
      .from("giacenze_settimana")
      .select("id")
      .eq("locale_id", id)
      .eq("settimana_key", settimanaKey)
      .limit(1)

    if (data && data.length > 0) {
      setBlocco(
        `Hai già inviato le giacenze di questa settimana. Potrai inserirle nuovamente da sabato ${prossimo}.`
      )
    }
  }

  function aggiornaQuantita(idProdotto: string, valore: string) {
    setQuantita({
      ...quantita,
      [idProdotto]: valore,
    })
  }

  function cambiaQuantita(idProdotto: string, variazione: number) {
    const attuale = Number(quantita[idProdotto] || 0)
    const nuova = Math.max(0, attuale + variazione)

    aggiornaQuantita(idProdotto, nuova === 0 ? "" : String(nuova))
  }

  function logout() {
    localStorage.clear()
    window.location.href = "/"
  }

  const prodottiFiltrati = useMemo(() => {
    let lista = [...prodotti]

    if (ricerca.trim()) {
      const r = ricerca.toLowerCase()

      lista = lista.filter(
        (p) =>
          p.nome_prodotto?.toLowerCase().includes(r) ||
          p.supplier_code?.toLowerCase().includes(r)
      )
    }

    if (filtro === "compilati") {
      lista = lista.filter((p) => Number(quantita[p.id] || 0) > 0)
    } else if (filtro !== "tutti") {
      lista = lista.filter((p) => statoSoglia(p) === filtro)
    }

    if (ordinamento === "nome") {
      lista.sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto))
    }

    if (ordinamento === "codice") {
      lista.sort((a, b) =>
        (a.supplier_code || "").localeCompare(b.supplier_code || "")
      )
    }

    if (ordinamento === "min") {
      lista.sort((a, b) => Number(b.min_stock || 0) - Number(a.min_stock || 0))
    }

    if (ordinamento === "max") {
      lista.sort((a, b) => Number(b.max_stock || 0) - Number(a.max_stock || 0))
    }

    if (ordinamento === "stato") {
      const peso: any = {
        "Sotto soglia": 1,
        Corretto: 2,
        "Sopra soglia": 3,
        "Da compilare": 4,
      }

      lista.sort((a, b) => peso[statoSoglia(a)] - peso[statoSoglia(b)])
    }

    return lista
  }, [prodotti, ricerca, filtro, ordinamento, quantita])

  const prodottiCompilati = prodotti.filter(
    (p) => Number(quantita[p.id] || 0) > 0
  ).length

  const quantitaTotaleCompilata = prodotti.reduce(
    (totale, p) => totale + Number(quantita[p.id] || 0),
    0
  )

  async function salvaGiacenze() {
    if (isSaving) return

    if (blocco) {
      showToast(blocco, "warning")
      return
    }

    if (!responsabile.trim()) {
      showToast("Inserisci il nome del responsabile", "warning")
      return
    }

    const conferma = window.confirm(
      `Stai salvando la giacenza di ${prodottiCompilati} prodotti con quantità maggiore di zero. Confermi?`
    )

    if (!conferma) return

    setIsSaving(true)

    const settimanaKey = getSettimanaKey()

    const righe = prodotti.map((p) => ({
      locale_id: localeId,
      locale_nome: localeNome,
      responsabile: responsabile.trim(),
      nome_prodotto: p.nome_prodotto,
      quantita: Number(quantita[p.id] || 0),
      settimana_key: settimanaKey,
    }))

    const { error } = await supabase.from("giacenze_settimana").insert(righe)

    if (error) {
      console.log(error)
      showToast("Errore salvataggio giacenze", "error")
      setIsSaving(false)
      return
    }

    showToast("Giacenze salvate!", "success")

    setTimeout(() => {
      window.location.href = "/dashboard"
    }, 800)
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-24 pt-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <LocaleMobileHeader />

        <section className="hidden rounded-2xl bg-slate-950 p-4 text-white shadow-lg lg:block">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black">OrdiniSiver</h1>
              <p className="text-sm font-bold text-slate-300">
                Giacenze settimana · {localeNome}
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white"
            >
              Logout
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white"
            >
              Home
            </button>

            <button
              onClick={() => window.history.back()}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white"
            >
              Indietro
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-black text-slate-950">
            Giacenze settimana
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-700">
            Inserisci le quantità disponibili.
          </p>
        </section>

        {blocco && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {blocco}
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="Cerca prodotto o codice..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
          />

          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
          >
            <option value="tutti">Tutti i prodotti</option>
            <option value="compilati">Solo compilati</option>
            <option value="Sotto soglia">Sotto soglia</option>
            <option value="Corretto">Corretto</option>
            <option value="Sopra soglia">Sopra soglia</option>
            <option value="Da compilare">Da compilare</option>
          </select>

          <select
            value={ordinamento}
            onChange={(e) => setOrdinamento(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
          >
            <option value="nome">Ordina per nome</option>
            <option value="codice">Ordina per codice</option>
            <option value="min">Ordina per giacenza minima</option>
            <option value="max">Ordina per giacenza massima</option>
            <option value="stato">Ordina per stato soglia</option>
          </select>
        </section>

        <input
          type="text"
          placeholder="Nome responsabile"
          value={responsabile}
          disabled={!!blocco || isSaving}
          onChange={(e) => setResponsabile(e.target.value)}
          className="h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600 disabled:bg-slate-200 disabled:text-slate-700"
        />

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-[11px] font-black uppercase text-slate-500">Prodotti compilati</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{prodottiCompilati}</p>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-[11px] font-black uppercase text-slate-500">Quantità totale</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{quantitaTotaleCompilata}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:overflow-hidden md:p-0">
          {loading ? (
            <div className="p-6 text-center text-sm font-bold text-slate-500">
              Caricamento prodotti...
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <div className="grid grid-cols-[140px_1fr_150px_150px_180px] bg-slate-950 text-[11px] font-bold uppercase tracking-wide text-white">
                  <div className="px-3 py-3">Codice</div>
                  <div className="px-3 py-3">Prodotto</div>
                  <div className="px-3 py-3">Stato soglia</div>
                  <div className="px-3 py-3">Giacenza min/max</div>
                  <div className="px-3 py-3">Giacenza</div>
                </div>

                {prodottiFiltrati.map((prodotto, index) => {
                  const stato = statoSoglia(prodotto)

                  return (
                    <div
                      key={`${prodotto.id}-${index}`}
                      className={`grid grid-cols-[140px_1fr_150px_150px_180px] border-b border-slate-100 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50"
                      }`}
                    >
                      <div className="px-3 py-3 text-xs font-bold text-slate-500">
                        {prodotto.supplier_code || "-"}
                      </div>

                      <div className="px-3 py-3 text-sm font-semibold text-slate-900">
                        {prodotto.nome_prodotto}
                      </div>

                      <div className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${classeStato(
                            stato
                          )}`}
                        >
                          {stato}
                        </span>
                      </div>

                      <div className="px-3 py-3 text-sm font-bold text-slate-600">
                        {prodotto.min_stock} / {prodotto.max_stock}
                      </div>

                      <div className="px-3 py-2">
                        <input
                          type="number"
                          value={quantita[prodotto.id] || ""}
                          disabled={!!blocco || isSaving}
                          onChange={(e) =>
                            aggiornaQuantita(
                              prodotto.id,
                              e.target.value
                            )
                          }
                          className="h-10 w-full rounded-lg border-2 border-slate-300 bg-white px-3 text-right text-sm font-bold text-slate-950 outline-none focus:border-blue-600 disabled:bg-slate-200 disabled:text-slate-700"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-3 md:hidden">
                {prodottiFiltrati.map((prodotto, index) => {
                  const stato = statoSoglia(prodotto)

                  return (
                    <div
                      key={`${prodotto.id}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-slate-500">
                            {prodotto.supplier_code || "-"}
                          </p>

                          <h3 className="mt-1 text-sm font-black leading-tight text-slate-950">
                            {prodotto.nome_prodotto}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">
                              Min/Max: {prodotto.min_stock}/{prodotto.max_stock}
                            </span>

                            <span
                              className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${classeStato(
                                stato
                              )}`}
                            >
                              {stato}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1 rounded-xl border-2 border-slate-200 bg-slate-50 p-1">
                          <button
                            type="button"
                            onClick={() => cambiaQuantita(prodotto.id, -1)}
                            disabled={!!blocco || isSaving}
                            className="flex h-11 w-10 items-center justify-center rounded-lg bg-white text-xl font-black text-slate-800 shadow-sm disabled:text-slate-300"
                            aria-label={`Diminuisci quantità ${prodotto.nome_prodotto}`}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={quantita[prodotto.id] || ""}
                            disabled={!!blocco || isSaving}
                            onChange={(e) => aggiornaQuantita(prodotto.id, e.target.value)}
                            className="h-11 w-14 bg-transparent text-center text-lg font-black text-slate-950 outline-none disabled:text-slate-500"
                          />
                          <button
                            type="button"
                            onClick={() => cambiaQuantita(prodotto.id, 1)}
                            disabled={!!blocco || isSaving}
                            className="flex h-11 w-10 items-center justify-center rounded-lg bg-blue-600 text-xl font-black text-white shadow-sm disabled:bg-slate-300"
                            aria-label={`Aumenta quantità ${prodotto.nome_prodotto}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {prodottiFiltrati.length === 0 && (
                <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                  Nessun prodotto trovato.
                </div>
              )}
            </>
          )}
        </section>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <button
            onClick={salvaGiacenze}
            disabled={!!blocco || isSaving || loading}
            className="h-14 w-full rounded-2xl bg-blue-700 px-5 text-base font-black text-white disabled:bg-slate-400"
          >
            {isSaving ? "Salvataggio..." : `Salva giacenze · ${prodottiCompilati} prodotti`}
          </button>
        </div>
      </div>
    </main>
  )
}