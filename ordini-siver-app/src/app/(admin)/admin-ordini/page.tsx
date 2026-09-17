"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { settimanaKeyCorrente } from "@/lib/settimana"

/*
  Riga d'ordine che porterebbe la giacenza oltre il massimo impostato per quel
  locale. Non blocca niente: e' l'amministrazione a decidere se ordinare lo
  stesso, ma deve saperlo prima di mandare l'ordine al fornitore.
*/
type SopraSoglia = {
  chiave: string
  locale: string
  prodotto: string
  ordinata: number
  giacenza: number
  massimo: number
  risultante: number
}

export default function AdminOrdini() {
  const [ordini, setOrdini] = useState<any[]>([])
  const [locali, setLocali] = useState<any[]>([])
  const [testo, setTesto] = useState("")
  const [titolo, setTitolo] = useState("Tutti i locali")
  const [localeFiltro, setLocaleFiltro] = useState("tutti")
  const [ricerca, setRicerca] = useState("")
  const [loading, setLoading] = useState(true)
  const [settimana, setSettimana] = useState(settimanaKeyCorrente())
  const [settimaneDisponibili, setSettimaneDisponibili] = useState<string[]>([])
  const [sopraSoglia, setSopraSoglia] = useState<Map<string, SopraSoglia>>(new Map())

  useEffect(() => {
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

    /*
      Senza il filtro sulla settimana il testo da mandare al fornitore
      conteneva tutti gli ordini mai fatti.
    */
    const settimane = Array.from(
      new Set((ordiniDb || []).map((o) => String(o.settimana_key || ""))),
    )
      .filter(Boolean)
      .sort()
      .reverse()

    setSettimaneDisponibili(settimane)

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

    await calcolaSopraSoglia(ordiniFormattati)

    setLoading(false)
  }

  /*
    Quanto si arriverebbe ad avere in casa: giacenza dichiarata piu' quantita'
    ordinata. Se supera il massimo impostato per quel locale, la riga viene
    segnalata.
  */
  async function calcolaSopraSoglia(listaOrdini: any[]) {
    const [{ data: prodottiDb }, { data: impostazioni }, { data: giacenze }] =
      await Promise.all([
        supabase.from("products").select("id, name"),
        supabase
          .from("restaurant_product_settings")
          .select("restaurant_id, product_id, prodotto_id, max_stock, active")
          .eq("active", true),
        supabase
          .from("giacenze_settimana")
          .select("locale_id, nome_prodotto, quantita, settimana_key"),
      ])

    const chiave = (valore: unknown) =>
      String(valore || "").trim().toUpperCase()

    const idPerNome = new Map(
      (prodottiDb || []).map((p: any) => [chiave(p.name), String(p.id)]),
    )

    const massimi = new Map<string, number>()

    for (const riga of impostazioni || []) {
      const idProdotto = String(riga.prodotto_id || riga.product_id || "")
      if (!idProdotto) continue
      massimi.set(`${riga.restaurant_id}|${idProdotto}`, Number(riga.max_stock || 0))
    }

    const giacenzePerRiga = new Map<string, number>()

    for (const riga of giacenze || []) {
      giacenzePerRiga.set(
        `${riga.locale_id}|${chiave(riga.nome_prodotto)}|${riga.settimana_key}`,
        Number(riga.quantita || 0),
      )
    }

    const segnalazioni = new Map<string, SopraSoglia>()

    for (const ordine of listaOrdini) {
      const idProdotto = idPerNome.get(chiave(ordine.nome_prodotto))
      if (!idProdotto) continue

      const massimo = massimi.get(`${ordine.locale_id}|${idProdotto}`) || 0
      if (massimo <= 0) continue

      const id = `${ordine.locale_id}|${chiave(ordine.nome_prodotto)}|${ordine.settimana_key}`
      const giacenza = giacenzePerRiga.get(id) || 0
      const ordinata =
        (segnalazioni.get(id)?.ordinata || 0) + Number(ordine.quantita || 0)
      const risultante = giacenza + ordinata

      if (risultante <= massimo) {
        segnalazioni.delete(id)
        continue
      }

      segnalazioni.set(id, {
        chiave: id,
        locale: String(ordine.locale_nome || "Locale"),
        prodotto: String(ordine.nome_prodotto || "Prodotto"),
        ordinata,
        giacenza,
        massimo,
        risultante,
      })
    }

    setSopraSoglia(segnalazioni)
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
    let lista = ordini.filter((o) => String(o.settimana_key || "") === settimana)

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
  }, [ordini, ricerca, localeFiltro, locali, settimana])

  useEffect(() => {
    generaTesto(ordiniFiltrati)
  }, [ordiniFiltrati])

  const segnalazioniVisibili = useMemo(() => {
    const idVisibili = new Set(
      ordiniFiltrati.map(
        (o) =>
          `${o.locale_id}|${String(o.nome_prodotto || "").trim().toUpperCase()}|${o.settimana_key}`,
      ),
    )

    return Array.from(sopraSoglia.values())
      .filter((riga) => idVisibili.has(riga.chiave))
      .sort(
        (a, b) =>
          b.risultante - b.massimo - (a.risultante - a.massimo) ||
          a.locale.localeCompare(b.locale),
      )
  }, [ordiniFiltrati, sopraSoglia])

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

        <section className="grid gap-3 md:grid-cols-4">
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

          <select
            value={settimana}
            onChange={(e) => setSettimana(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
          >
            {(settimaneDisponibili.includes(settimana)
              ? settimaneDisponibili
              : [settimana, ...settimaneDisponibili]
            ).map((chiave) => (
              <option key={chiave} value={chiave}>
                Settimana del {new Date(chiave).toLocaleDateString("it-IT", { timeZone: "UTC" })}
                {chiave === settimanaKeyCorrente() ? " (corrente)" : ""}
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

        {segnalazioniVisibili.length > 0 && (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-amber-900">
                  {segnalazioniVisibili.length} righe portano la giacenza oltre il massimo
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-amber-800">
                  Non blocca l&apos;ordine: decidi tu se mandarlo lo stesso o
                  ridurre la quantità nel testo qui sotto.
                </p>

                <div className="mt-3 space-y-1">
                  {segnalazioniVisibili.map((riga) => (
                    <div
                      key={riga.chiave}
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <span className="font-bold text-slate-950">{riga.locale}</span>
                      {" · "}
                      {riga.prodotto}
                      {": ha "}
                      {riga.giacenza}
                      {", ordina "}
                      {riga.ordinata}
                      {" → arriverebbe a "}
                      <span className="font-bold text-amber-800">{riga.risultante}</span>
                      {", massimo "}
                      {riga.massimo}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

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