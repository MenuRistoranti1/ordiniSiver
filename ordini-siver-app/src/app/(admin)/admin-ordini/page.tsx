"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { settimanaKeyCorrente } from "@/lib/settimana"
import { motivoSegnalazione, quantitaConsigliata } from "@/lib/consiglio"
import { leggiTutte } from "@/lib/lettura"

/*
  Riga d'ordine che porterebbe la giacenza oltre il massimo impostato per quel
  locale. Non blocca niente: e' l'amministrazione a decidere se ordinare lo
  stesso, ma deve saperlo prima di mandare l'ordine al fornitore.
*/
type Segnalazione = {
  chiave: string
  /** Righe d'ordine da correggere: una per locale, prodotto e settimana. */
  ordineIds: string[]
  tipo: "oltre_massimo" | "piu_del_consigliato" | "gia_in_arrivo"
  locale: string
  prodotto: string
  ordinata: number
  giacenza: number
  massimo: number
  risultante: number
  minimo: number
  consigliata: number
  inArrivo: number
}

const TESTO_TIPO: Record<Segnalazione["tipo"], string> = {
  oltre_massimo: "oltre il massimo",
  gia_in_arrivo: "già in arrivo",
  piu_del_consigliato: "più del consigliato",
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
  const [sopraSoglia, setSopraSoglia] = useState<Map<string, Segnalazione>>(new Map())
  /*
    Righe oltre il massimo che l'amministrazione ha deciso di mandare cosi'
    come sono. Vale per la sessione: serve a togliere dall'elenco cio' che e'
    gia' stato guardato, non a registrare una decisione.
  */
  const [confermate, setConfermate] = useState<string[]>([])
  const [correzione, setCorrezione] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState("")

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

    const ordiniDb = await leggiTutte<any>((da, a) =>
      supabase
        .from("ordini")
        .select("*")
        .order("locale_nome", { ascending: true })
        .range(da, a),
    )

    /*
      Senza il filtro sulla settimana il testo da mandare al fornitore
      conteneva tutti gli ordini mai fatti.
    */
    const settimane = Array.from(
      new Set(ordiniDb.map((o: any) => String(o.settimana_key || ""))),
    )
      .filter(Boolean)
      .sort()
      .reverse()

    setSettimaneDisponibili(settimane)

    setLocali(localiDb || [])

    const ordiniFormattati = ordiniDb.map((ordine: any) => ({
      ...ordine,
      codice: codici[ordine.nome_prodotto] || "",
    }))

    setOrdini(ordiniFormattati)

    await calcolaSegnalazioni(ordiniFormattati)

    setLoading(false)
  }

  /*
    Le tre cose che l'amministrazione deve sapere prima di mandare l'ordine:
    la merce in casa supererebbe il massimo, il prodotto e' gia' in arrivo da
    un ordine precedente, oppure se ne chiede piu' di quanto il sistema
    proponga. Nessuna blocca niente.
  */
  async function calcolaSegnalazioni(listaOrdini: any[]) {
    const [prodottiDb, impostazioni, giacenze] = await Promise.all([
      leggiTutte<any>((da, a) =>
        supabase.from("products").select("id, name").range(da, a),
      ),
      leggiTutte<any>((da, a) =>
        supabase
          .from("restaurant_product_settings")
          .select("restaurant_id, product_id, prodotto_id, min_stock, max_stock, active")
          .range(da, a),
      ),
      leggiTutte<any>((da, a) =>
        supabase
          .from("giacenze_settimana")
          .select("locale_id, nome_prodotto, quantita, settimana_key")
          .range(da, a),
      ),
    ])

    const chiave = (valore: unknown) => String(valore || "").trim().toUpperCase()

    const idPerNome = new Map<string, string>(
      prodottiDb.map((p: any) => [chiave(p.name), String(p.id)] as [string, string]),
    )

    const soglie = new Map<string, { min: number; max: number }>()

    for (const riga of impostazioni.filter((riga: any) => riga.active)) {
      const idProdotto = String(riga.prodotto_id || riga.product_id || "")
      if (!idProdotto) continue

      soglie.set(`${riga.restaurant_id}|${idProdotto}`, {
        min: Number(riga.min_stock || 0),
        max: Number(riga.max_stock || 0),
      })
    }

    const giacenzePerRiga = new Map<string, number>()

    for (const riga of giacenze) {
      giacenzePerRiga.set(
        `${riga.locale_id}|${chiave(riga.nome_prodotto)}|${riga.settimana_key}`,
        Number(riga.quantita || 0),
      )
    }

    const segnalazioni = new Map<string, Segnalazione>()

    for (const ordine of listaOrdini) {
      const nome = chiave(ordine.nome_prodotto)
      const idProdotto = idPerNome.get(nome)
      if (!idProdotto) continue

      const soglia = soglie.get(`${ordine.locale_id}|${idProdotto}`)
      if (!soglia) continue

      const id = `${ordine.locale_id}|${nome}|${ordine.settimana_key}`
      const giacenza = giacenzePerRiga.get(id) || 0

      const ordinata =
        (segnalazioni.get(id)?.ordinata || 0) + Number(ordine.quantita || 0)

      /*
        Merce gia' ordinata e non ancora arrivata, dalle settimane precedenti:
        e' la stessa che il locale vede come "in arrivo".
      */
      const inArrivo = listaOrdini
        .filter(
          (altro: any) =>
            altro.locale_id === ordine.locale_id &&
            chiave(altro.nome_prodotto) === nome &&
            String(altro.settimana_key || "") < String(ordine.settimana_key || "") &&
            altro.stato_consegna !== "annullato",
        )
        .reduce(
          (somma: number, altro: any) =>
            somma +
            Math.max(
              0,
              Number(altro.quantita || 0) - Number(altro.quantita_consegnata || 0),
            ),
          0,
        )

      const mediaStorica = mediaUltimiOrdini(listaOrdini, ordine, nome, chiave)

      const consigliata = quantitaConsigliata({
        giacenza,
        minStock: soglia.min,
        maxStock: soglia.max,
        mediaStorica,
        inArrivo,
      })

      const tipo = motivoSegnalazione({
        ordinata,
        consigliata,
        giacenza,
        maxStock: soglia.max,
        inArrivo,
      })

      if (!tipo) {
        segnalazioni.delete(id)
        continue
      }

      segnalazioni.set(id, {
        chiave: id,
        ordineIds: [...(segnalazioni.get(id)?.ordineIds || []), String(ordine.id)],
        tipo,
        locale: String(ordine.locale_nome || "Locale"),
        prodotto: String(ordine.nome_prodotto || "Prodotto"),
        ordinata,
        giacenza,
        massimo: soglia.max,
        risultante: giacenza + ordinata,
        minimo: soglia.min,
        consigliata,
        inArrivo,
      })
    }

    setSopraSoglia(segnalazioni)
  }

  /** Media degli ultimi quattro ordini dello stesso prodotto nello stesso locale. */
  function mediaUltimiOrdini(
    listaOrdini: any[],
    ordine: any,
    nome: string,
    chiave: (valore: unknown) => string,
  ) {
    const precedenti = listaOrdini
      .filter(
        (altro: any) =>
          altro.locale_id === ordine.locale_id &&
          chiave(altro.nome_prodotto) === nome &&
          String(altro.settimana_key || "") < String(ordine.settimana_key || ""),
      )
      .sort((a: any, b: any) =>
        String(b.settimana_key || "").localeCompare(String(a.settimana_key || "")),
      )
      .slice(0, 4)

    if (precedenti.length === 0) return 0

    return (
      precedenti.reduce(
        (somma: number, altro: any) => somma + Number(altro.quantita || 0),
        0,
      ) / precedenti.length
    )
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

  /* Il massimo si scrive solo dove è stato impostato: zero vuol dire "nessun tetto". */
  const limite = (massimo: number) => (massimo > 0 ? `, massimo ${massimo}` : "")

  /*
    Qui il massimo non è la ragione dell'avviso: dirlo e basta faceva sembrare
    che ci fosse uno sforamento anche quando la quantità ci sta dentro.
  */
  const dentroIlMassimo = (massimo: number) =>
    massimo > 0 ? `, dentro il massimo di ${massimo}` : ""

  const peso = (tipo: Segnalazione["tipo"]) =>
    tipo === "oltre_massimo" ? 0 : tipo === "gia_in_arrivo" ? 1 : 2

  const segnalazioniVisibili = useMemo(() => {
    const idVisibili = new Set(
      ordiniFiltrati.map(
        (o) =>
          `${o.locale_id}|${String(o.nome_prodotto || "").trim().toUpperCase()}|${o.settimana_key}`,
      ),
    )

    return Array.from(sopraSoglia.values())
      .filter((riga) => idVisibili.has(riga.chiave) && !confermate.includes(riga.chiave))
      .sort(
        (a, b) =>
          peso(a.tipo) - peso(b.tipo) ||
          b.risultante - b.massimo - (a.risultante - a.massimo) ||
          a.locale.localeCompare(b.locale),
      )
  }, [ordiniFiltrati, sopraSoglia, confermate])

  const totaleQuantita = useMemo(() => {
    return ordiniFiltrati.reduce(
      (sum, item) => sum + Number(item.quantita || 0),
      0
    )
  }, [ordiniFiltrati])

  /*
    Correzione della quantità direttamente da qui: e' il punto in cui
    l'amministrazione guarda l'ordine prima di mandarlo, e tornare indietro
    fino alla schermata del locale per cambiare un numero non ha senso.
  */
  async function salvaQuantita(riga: Segnalazione) {
    const nuova = Number(correzione[riga.chiave])

    if (!Number.isFinite(nuova) || nuova < 0) {
      alert("Inserisci una quantità valida")
      return
    }

    setSalvando(riga.chiave)

    const { error } = await supabase
      .from("ordini")
      .update({ quantita: nuova })
      .in("id", riga.ordineIds)

    setSalvando("")

    if (error) {
      console.log(error)
      alert("Errore nel salvataggio della quantità")
      return
    }

    setCorrezione((attuali) => {
      const prossimi = { ...attuali }
      delete prossimi[riga.chiave]
      return prossimi
    })

    await caricaDati()
  }

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
                  {segnalazioniVisibili.length} righe da guardare prima di mandare l&apos;ordine
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-amber-800">
                  Non blocca l&apos;ordine: correggi la quantità qui sotto
                  oppure conferma e la riga esce dall&apos;elenco.
                </p>

                <div className="mt-3 space-y-1">
                  {segnalazioniVisibili.map((riga) => (
                    <div
                      key={riga.chiave}
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-900">
                          {TESTO_TIPO[riga.tipo]}
                        </span>
                        <span className="font-bold text-slate-950">{riga.locale}</span>
                        <span>{riga.prodotto}</span>
                      </div>

                      <p className="mt-1">
                        {riga.tipo === "oltre_massimo" &&
                          `ha ${riga.giacenza}, ordina ${riga.ordinata} → arriverebbe a ${riga.risultante}, massimo ${riga.massimo}`}
                        {riga.tipo === "gia_in_arrivo" &&
                          `ordina ${riga.ordinata} ma ha già ${riga.inArrivo} pezzi ordinati e non ancora arrivati: arriverebbe a ${riga.risultante + riga.inArrivo}${limite(riga.massimo)}`}
                        {riga.tipo === "piu_del_consigliato" &&
                          (riga.consigliata > 0
                            ? `ordina ${riga.ordinata} invece dei ${riga.consigliata} consigliati. Arriverebbe a ${riga.risultante}${dentroIlMassimo(riga.massimo)}`
                            : `ordina ${riga.ordinata} ma non ne servivano: ne ha ${riga.giacenza}${riga.minimo > 0 ? `, sopra il minimo di ${riga.minimo}` : ""}. Arriverebbe a ${riga.risultante}${dentroIlMassimo(riga.massimo)}`)}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={correzione[riga.chiave] ?? String(riga.ordinata)}
                          onChange={(e) =>
                            setCorrezione((attuali) => ({
                              ...attuali,
                              [riga.chiave]: e.target.value,
                            }))
                          }
                          className="h-10 w-24 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
                        />

                        <button
                          type="button"
                          onClick={() => void salvaQuantita(riga)}
                          disabled={salvando === riga.chiave}
                          className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
                        >
                          {salvando === riga.chiave ? "Salvo..." : "Salva quantità"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setConfermate((attuali) => [...attuali, riga.chiave])
                          }
                          disabled={salvando === riga.chiave}
                          className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Va bene così
                        </button>
                      </div>
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