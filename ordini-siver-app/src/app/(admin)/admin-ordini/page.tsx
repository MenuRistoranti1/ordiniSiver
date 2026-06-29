"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AdminOrdini() {
  const [ordini, setOrdini] = useState<any[]>([])
  const [locali, setLocali] = useState<any[]>([])
  const [testo, setTesto] = useState("")
  const [titolo, setTitolo] = useState("Tutti i locali")
  const [localeFiltro, setLocaleFiltro] = useState("tutti")
  const [ricerca, setRicerca] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

    caricaDati()
  }, [])

  async function caricaDati() {
    setLoading(true)

    const { data: prodotti } = await supabase
      .from("products")
      .select("name, supplier_code")

    const codici: any = {}

    prodotti?.forEach((p) => {
      codici[p.name] = p.supplier_code
    })

    const { data: localiDb } = await supabase
      .from("restaurants")
      .select("id, name")
      .order("name")

    const { data: ordiniDb, error } = await supabase
      .from("ordini")
      .select("*")
      .order("locale_nome", { ascending: true })

    if (error) {
      console.log(error)
      alert("Errore caricamento ordini")
      setLoading(false)
      return
    }

    setLocali(localiDb || [])

    const ordiniFormattati = (ordiniDb || []).map((ordine) => ({
      ...ordine,
      codice: codici[ordine.nome_prodotto] || "",
    }))

    setOrdini(ordiniFormattati)

    generaTesto(ordiniFormattati)

    setLoading(false)
  }

  function generaTesto(listaOrdini: any[]) {
    const gruppi: any = {}

    listaOrdini.forEach((ordine) => {
      const locale = ordine.locale_nome || "SENZA LOCALE"
      const prodotto = ordine.nome_prodotto
      const quantita = Number(ordine.quantita || 0)
      const codice = ordine.codice || ""

      if (!gruppi[locale]) {
        gruppi[locale] = {}
      }

      if (!gruppi[locale][prodotto]) {
        gruppi[locale][prodotto] = {
          quantita: 0,
          codice,
        }
      }

      gruppi[locale][prodotto].quantita += quantita
    })

    let risultato = ""

    Object.keys(gruppi).forEach((locale) => {
      risultato += `${locale}\n`

      Object.keys(gruppi[locale]).forEach((prodotto) => {
        const item = gruppi[locale][prodotto]

        risultato += `${item.quantita} ${prodotto} ${item.codice}\n`
      })

      risultato += "\n"
    })

    setTesto(risultato || "Nessun ordine trovato.")
  }

  const ordiniFiltrati = useMemo(() => {
    let lista = [...ordini]

    if (localeFiltro !== "tutti") {
      lista = lista.filter((o) => o.locale_id === localeFiltro)

      const locale = locali.find((l) => l.id === localeFiltro)

      if (locale) {
        setTitolo(locale.name)
      }
    } else {
      setTitolo("Tutti i locali")
    }

    if (ricerca.trim()) {
      const q = ricerca.toLowerCase()

      lista = lista.filter((ordine) =>
        [
          ordine.nome_prodotto,
          ordine.locale_nome,
          ordine.codice,
          ordine.responsabile,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    }

    return lista
  }, [ordini, ricerca, localeFiltro, locali])

  useEffect(() => {
    generaTesto(ordiniFiltrati)
  }, [ordiniFiltrati])

  const totaleQuantita = useMemo(() => {
    return ordiniFiltrati.reduce(
      (sum, item) => sum + Number(item.quantita || 0),
      0
    )
  }, [ordiniFiltrati])

  function copiaTesto() {
    navigator.clipboard.writeText(testo)
    alert("Ordine copiato!")
  }

  function scaricaTxt() {
    const blob = new Blob([testo], { type: "text/plain" })
    const url = URL.createObjectURL(blob)

    const nomeFile =
      titolo === "Tutti i locali"
        ? "ordini-tutti-locali.txt"
        : `ordine-${titolo}.txt`

    const a = document.createElement("a")
    a.href = url
    a.download = nomeFile
    a.click()

    URL.revokeObjectURL(url)
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

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
                Admin · Ordine fornitore
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white"
            >
              Logout
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => (window.location.href = "/admin-dashboard")}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Home Admin
            </button>

            <button
              onClick={() => window.history.back()}
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white"
            >
              Indietro
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            Ordine Fornitore
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
            {titolo}
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Ordini
            </p>

            <p className="mt-1 text-2xl font-black text-slate-950">
              {ordiniFiltrati.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Locali
            </p>

            <p className="mt-1 text-2xl font-black text-slate-950">
              {
                [...new Set(ordiniFiltrati.map((o) => o.locale_nome))].length
              }
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Quantità totali
            </p>

            <p className="mt-1 text-2xl font-black text-slate-950">
              {totaleQuantita}
            </p>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="Cerca prodotto, locale o codice..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
          />

          <select
            value={localeFiltro}
            onChange={(e) => setLocaleFiltro(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
          >
            <option value="tutti">Tutti i locali</option>

            {locali.map((locale) => (
              <option key={locale.id} value={locale.id}>
                {locale.name}
              </option>
            ))}
          </select>

          <button
            onClick={caricaDati}
            className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
          >
            Aggiorna
          </button>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={copiaTesto}
            className="h-11 rounded-xl bg-green-600 px-4 text-sm font-bold text-white"
          >
            Copia TXT
          </button>

          <button
            onClick={scaricaTxt}
            className="h-11 rounded-xl bg-slate-800 px-4 text-sm font-bold text-white"
          >
            Scarica TXT
          </button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-center text-sm font-bold text-slate-500">
              Caricamento ordini...
            </div>
          ) : (
            <textarea
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              className="min-h-[650px] w-full resize-none border-0 p-4 font-mono text-sm font-semibold text-slate-900 outline-none"
            />
          )}
        </section>
      </div>
    </main>
  )
}