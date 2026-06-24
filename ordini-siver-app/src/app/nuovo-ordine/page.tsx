"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"

type RigaLibera = {
  nome_prodotto: string
  misura: string
  quantita: string
}

export default function NuovoOrdine() {
  const { showToast } = useToast()

  const [prodotti, setProdotti] = useState<any[]>([])
  const [quantita, setQuantita] = useState<any>({})
  const [righeLibere, setRigheLibere] = useState<RigaLibera[]>([
    { nome_prodotto: "", misura: "", quantita: "" },
  ])

  const [localeId, setLocaleId] = useState("")
  const [localeNome, setLocaleNome] = useState("")
  const [responsabile, setResponsabile] = useState("")
  const [blocco, setBlocco] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [ricerca, setRicerca] = useState("")
  const [filtro, setFiltro] = useState("tutti")
  const [ordinamento, setOrdinamento] = useState("stato")
  const [soloSelezionati, setSoloSelezionati] = useState(false)
  const [riepilogoAperto, setRiepilogoAperto] = useState(false)

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
    controllaBloccoOrdine(id)
  }, [])

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

  async function controllaBloccoOrdine(id: string) {
    const settimanaKey = getSettimanaKey()
    const prossimo = prossimoSabato().toLocaleDateString("it-IT")

    const { data: giacenze } = await supabase
      .from("giacenze_settimana")
      .select("id")
      .eq("locale_id", String(id))
      .limit(1)

    if (!giacenze || giacenze.length === 0) {
      setBlocco(
        "Prima di effettuare un ordine devi inserire le giacenze della settimana."
      )
      return
    }

    const { data: ordini, error } = await supabase
      .from("ordini")
      .select("*")
      .eq("locale_id", String(id))
      .eq("settimana_key", settimanaKey)

    console.log("CONTROLLO ORDINI:", ordini)
    console.log("ERRORE ORDINI:", error)

    if (Array.isArray(ordini) && ordini.length > 0) {
      setBlocco(
        `Hai già inviato l'ordine di questa settimana. Potrai effettuare un nuovo ordine da sabato ${prossimo}.`
      )
    }
  }


  async function caricaProdotti(id: string) {
    setLoading(true)

    const { data: impostazioni, error: errorImpostazioni } = await supabase
      .from("restaurant_product_settings")
      .select("id, active, min_stock, max_stock, prodotto_id, product_id")
      .eq("restaurant_id", id)
      .eq("active", true)

    if (errorImpostazioni) {
      console.log("Errore impostazioni:", errorImpostazioni)
      showToast("Errore caricamento prodotti", "error")
      setLoading(false)
      return
    }

    const idsProdotti = (impostazioni || [])
      .map((item: any) => item.prodotto_id || item.product_id)
      .filter(Boolean)

    const { data: prodottiDb, error: errorProdotti } = await supabase
      .from("products")
      .select("id, name, supplier_code, active")
      .in("id", idsProdotti)
      .eq("active", true)

    if (errorProdotti) {
      console.log("Errore prodotti:", errorProdotti)
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

    const { data: giacenzeDb, error: errorGiacenze } = await supabase
      .from("giacenze_settimana")
      .select("nome_prodotto, quantita, created_at")
      .eq("locale_id", id)
      .order("created_at", { ascending: false })

    if (errorGiacenze) {
      console.log("Errore giacenze:", errorGiacenze)
      showToast("Errore caricamento giacenze", "error")
      setLoading(false)
      return
    }

    const { data: storicoOrdini, error: errorStorico } = await supabase
      .from("ordini")
      .select("nome_prodotto, quantita, created_at")
      .eq("locale_id", id)
      .order("created_at", { ascending: false })

    if (errorStorico) {
      console.log("Errore storico ordini:", errorStorico)
    }

    const prodottiFormattati = (impostazioni || [])
      .map((item: any) => {
        const idProdotto = item.prodotto_id || item.product_id

        const prodotto = prodottiPuliti.find(
          (p: any) => String(p.id) === String(idProdotto)
        )

        if (!prodotto) return null

        const nomeProdotto = prodotto?.name || "Prodotto"

        const giacenza = (giacenzeDb || []).find(
          (g: any) =>
            String(g.nome_prodotto || "").toLowerCase().trim() ===
            String(nomeProdotto || "").toLowerCase().trim()
        )

        const qtaGiacenza = Number(giacenza?.quantita || 0)
        const min = Number(item.min_stock || 0)
        const max = Number(item.max_stock || 0)

        const ordiniProdotto = (storicoOrdini || []).filter(
          (o: any) =>
            String(o.nome_prodotto || "").toLowerCase().trim() ===
            String(nomeProdotto || "").toLowerCase().trim()
        )

        const ultime4 = ordiniProdotto.slice(0, 4)

        const mediaStorica =
          ultime4.length > 0
            ? ultime4.reduce(
                (sum: number, o: any) => sum + Number(o.quantita || 0),
                0
              ) / ultime4.length
            : 0

        const consigliatoStorico =
          qtaGiacenza < mediaStorica
            ? Math.ceil(mediaStorica - qtaGiacenza)
            : 0

        const consigliatoSoglia =
          max > 0 && qtaGiacenza < min ? max - qtaGiacenza : 0

        const consigliato = Math.max(consigliatoStorico, consigliatoSoglia)

        return {
          id: idProdotto,
          nome_prodotto: nomeProdotto,
          supplier_code: prodotto?.supplier_code || "-",
          giacenza: qtaGiacenza,
          min_stock: min,
          max_stock: max,
          media_storica: Math.ceil(mediaStorica),
          consigliato,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) =>
        String(a.nome_prodotto || "").localeCompare(
          String(b.nome_prodotto || "")
        )
      )

    const qtaIniziali: any = {}

    prodottiFormattati.forEach((p: any) => {
      if (p.consigliato > 0) {
        qtaIniziali[p.id] = String(p.consigliato)
      }
    })

    setProdotti(prodottiFormattati)
    setQuantita(qtaIniziali)
    setLoading(false)
  }


  function statoSoglia(prodotto: any) {
    const qta = Number(prodotto.giacenza || 0)
    const min = Number(prodotto.min_stock || 0)
    const max = Number(prodotto.max_stock || 0)

    if (min > 0 && qta < min) return "Sotto soglia"
    if (max > 0 && qta > max) return "Sopra soglia"

    return "Corretto"
  }

  function classeStato(stato: string) {
    if (stato === "Sotto soglia") return "bg-red-100 text-red-700"
    if (stato === "Sopra soglia") return "bg-orange-100 text-orange-700"
    return "bg-green-100 text-green-700"
  }

  function aggiornaQuantita(idProdotto: string, valore: string) {
    setQuantita({ ...quantita, [idProdotto]: valore })
  }

  function cambiaQuantita(idProdotto: string, variazione: number) {
    const attuale = Number(quantita[idProdotto] || 0)
    const nuova = Math.max(0, attuale + variazione)

    aggiornaQuantita(idProdotto, nuova === 0 ? "" : String(nuova))
  }

  function cambiaQuantitaLibera(index: number, variazione: number) {
    const attuale = Number(righeLibere[index]?.quantita || 0)
    const nuova = Math.max(0, attuale + variazione)

    aggiornaLibera(index, "quantita", nuova === 0 ? "" : String(nuova))
  }

  function aggiornaLibera(index: number, campo: keyof RigaLibera, valore: string) {
    const nuoveRighe = [...righeLibere]
    nuoveRighe[index] = { ...nuoveRighe[index], [campo]: valore }
    setRigheLibere(nuoveRighe)
  }

  function aggiungiRigaLibera() {
    setRigheLibere([
      ...righeLibere,
      { nome_prodotto: "", misura: "", quantita: "" },
    ])
  }

  function rimuoviRigaLibera(index: number) {
    setRigheLibere(righeLibere.filter((_, i) => i !== index))
  }

  function applicaConsigliati() {
    const nuove: any = {}

    prodotti.forEach((p) => {
      if (p.consigliato > 0) {
        nuove[p.id] = String(p.consigliato)
      }
    })

    setQuantita(nuove)
    showToast("Quantità consigliate applicate", "success")
  }

  function svuotaOrdine() {
    setQuantita({})
    showToast("Ordine svuotato", "success")
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

    if (filtro !== "tutti") {
      lista = lista.filter((p) => statoSoglia(p) === filtro)
    }

    if (soloSelezionati) {
      lista = lista.filter((p) => Number(quantita[p.id] || 0) > 0)
    }

    if (ordinamento === "nome") {
      lista.sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto))
    }

    if (ordinamento === "codice") {
      lista.sort((a, b) =>
        String(a.supplier_code || "").localeCompare(String(b.supplier_code || ""))
      )
    }

    if (ordinamento === "consigliato") {
      lista.sort(
        (a, b) => Number(b.consigliato || 0) - Number(a.consigliato || 0)
      )
    }

    if (ordinamento === "stato") {
      const peso: any = {
        "Sotto soglia": 1,
        Corretto: 2,
        "Sopra soglia": 3,
      }

      lista.sort((a, b) => peso[statoSoglia(a)] - peso[statoSoglia(b)])
    }

    return lista
  }, [prodotti, ricerca, filtro, ordinamento, soloSelezionati, quantita])

  const prodottiSelezionati = prodotti.filter(
    (p) => Number(quantita[p.id] || 0) > 0
  )

  const righeLibereSelezionate = righeLibere.filter(
    (riga) =>
      riga.nome_prodotto.trim() &&
      riga.misura.trim() &&
      Number(riga.quantita || 0) > 0
  )

  const numeroRigheOrdine = prodottiSelezionati.length + righeLibereSelezionate.length

  const quantitaTotaleOrdine =
    prodottiSelezionati.reduce(
      (totale, p) => totale + Number(quantita[p.id] || 0),
      0
    ) +
    righeLibereSelezionate.reduce(
      (totale, riga) => totale + Number(riga.quantita || 0),
      0
    )

  async function salvaOrdine() {
    if (isSaving) return

    if (blocco) {
      showToast(blocco, "warning")
      return
    }

    if (!responsabile.trim()) {
      showToast("Inserisci il nome del responsabile", "warning")
      return
    }

    const libereIncomplete = righeLibere.some(
      (riga) =>
        (riga.nome_prodotto.trim() || riga.misura.trim() || riga.quantita) &&
        (!riga.nome_prodotto.trim() ||
          !riga.misura.trim() ||
          !riga.quantita ||
          Number(riga.quantita) <= 0)
    )

    if (libereIncomplete) {
      showToast(
        "Per i prodotti non presenti in lista devi inserire nome, misure e quantità",
        "warning"
      )
      return
    }

    const settimanaKey = getSettimanaKey()

    const righeProdotti = prodotti
      .filter(
        (p) =>
          quantita[p.id] &&
          Number(quantita[p.id]) > 0
      )
      .map((p) => ({
        locale_id: localeId,
        locale_nome: localeNome,
        responsabile: responsabile.trim(),
nome_prodotto: p.nome_prodotto,
supplier_code: p.supplier_code || "",
misure: "",
quantita: Number(quantita[p.id]),
settimana_key: settimanaKey,
      }))

    const righeLibereValide = righeLibere
      .filter(
        (riga) =>
          riga.nome_prodotto.trim() &&
          riga.misura.trim() &&
          riga.quantita &&
          Number(riga.quantita) > 0
      )
      .map((riga) => ({
        locale_id: localeId,
        locale_nome: localeNome,
        responsabile: responsabile.trim(),
        nome_prodotto: riga.nome_prodotto.trim(),
        misure: riga.misura.trim(),
        quantita: Number(riga.quantita),
        settimana_key: settimanaKey,
      }))

    const righeOrdine = [...righeProdotti, ...righeLibereValide]

    if (righeOrdine.length === 0) {
      showToast("Inserisci almeno una quantità", "warning")
      return
    }

    const conferma = window.confirm(
      `Stai inviando ${righeOrdine.length} prodotti per una quantità totale di ${quantitaTotaleOrdine}. Confermi l'invio dell'ordine?`
    )

    if (!conferma) return

    setIsSaving(true)

    const { error } = await supabase.from("ordini").upsert(righeOrdine, {
      onConflict: "locale_id,settimana_key,nome_prodotto",
    })

    console.log("ERRORE SALVATAGGIO ORDINE:", error)

    if (error) {
      console.log(error)
      setIsSaving(false)

      if (error.message?.includes("unique_ordine_locale_settimana")) {
        showToast("Hai già inviato l'ordine di questa settimana.", "warning")
      } else {
        showToast("Errore salvataggio ordine", "error")
      }

      return
    }

    showToast("Ordine salvato!", "success")

    setTimeout(() => {
      window.location.href = "/dashboard"
    }, 900)
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-24 pt-4 sm:px-5 sm:pb-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <LocaleMobileHeader />

        <section className="hidden rounded-2xl bg-slate-950 p-4 text-white shadow-lg lg:block">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                OrdiniSiver
              </h1>

              <p className="mt-0.5 text-xs font-medium text-slate-300">
                Nuovo ordine · {localeNome}
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
              onClick={() => (window.location.href = "/dashboard")}
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
          <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            Nuovo ordine
          </h2>

          <p className="mt-1 text-xs font-bold text-slate-700 sm:text-sm">
            Ordine consigliato con soglie e media storica delle ultime 4 settimane.
          </p>
        </section>

        {blocco && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 sm:text-sm">
            {blocco}
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Cerca prodotto o codice..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 placeholder:text-slate-500 shadow-sm outline-none focus:border-blue-600 md:col-span-2"
          />

          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 shadow-sm outline-none focus:border-blue-600"
          >
            <option value="tutti">Tutti</option>
            <option value="Sotto soglia">Sotto soglia</option>
            <option value="Corretto">Corretto</option>
            <option value="Sopra soglia">Sopra soglia</option>
          </select>

          <select
            value={ordinamento}
            onChange={(e) => setOrdinamento(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 shadow-sm outline-none focus:border-blue-600"
          >
            <option value="stato">Ordina per stato</option>
            <option value="consigliato">Ordina per consigliato</option>
            <option value="nome">Ordina per nome</option>
            <option value="codice">Ordina per codice</option>
          </select>
        </section>

        <section className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={applicaConsigliati}
            disabled={!!blocco || isSaving || loading}
            className="h-14 rounded-2xl bg-green-600 px-4 text-sm font-bold text-white disabled:bg-slate-400"
          >
            Applica ordine consigliato
          </button>

          <button
            onClick={svuotaOrdine}
            disabled={!!blocco || isSaving || loading}
            className="h-14 rounded-2xl bg-slate-800 px-4 text-sm font-bold text-white disabled:bg-slate-400"
          >
            Svuota quantità
          </button>

          <button
            type="button"
            onClick={() => setSoloSelezionati(!soloSelezionati)}
            className={`h-14 rounded-2xl px-4 text-sm font-bold sm:col-span-2 ${
              soloSelezionati ? "bg-blue-600 text-white" : "border-2 border-blue-200 bg-white text-blue-700"
            }`}
          >
            {soloSelezionati ? "Mostra tutti i prodotti" : `Solo selezionati (${numeroRigheOrdine})`}
          </button>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
          <button
            type="button"
            onClick={() => setRiepilogoAperto(!riepilogoAperto)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <p className="text-[11px] font-black uppercase text-blue-600">Riepilogo ordine</p>
              <p className="mt-1 text-sm font-black text-slate-950">
                {numeroRigheOrdine} prodotti · Quantità totale {quantitaTotaleOrdine}
              </p>
            </div>
            <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
              {riepilogoAperto ? "Chiudi" : "Apri"}
            </span>
          </button>

          {riepilogoAperto && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              {prodottiSelezionati.map((prodotto) => (
                <div key={prodotto.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900">{prodotto.nome_prodotto}</p>
                    <p className="text-[10px] font-bold text-slate-500">{prodotto.supplier_code || "-"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-white px-2 py-1 text-sm font-black text-slate-950">{quantita[prodotto.id]}</span>
                    <button
                      type="button"
                      onClick={() => aggiornaQuantita(prodotto.id, "")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-sm font-black text-red-700"
                      aria-label={`Rimuovi ${prodotto.nome_prodotto}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              {righeLibereSelezionate.map((riga, index) => (
                <div key={`${riga.nome_prodotto}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900">{riga.nome_prodotto}</p>
                    <p className="text-[10px] font-bold text-amber-700">Fuori lista · {riga.misura}</p>
                  </div>
                  <span className="rounded-lg bg-white px-2 py-1 text-sm font-black text-slate-950">{riga.quantita}</span>
                </div>
              ))}

              {numeroRigheOrdine === 0 && (
                <p className="text-sm font-bold text-slate-500">Nessun prodotto selezionato.</p>
              )}
            </div>
          )}
        </section>

        <input
          type="text"
          placeholder="Nome responsabile"
          value={responsabile}
          onChange={(e) => setResponsabile(e.target.value)}
          disabled={!!blocco || isSaving}
          className="h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600 disabled:bg-slate-200"
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:overflow-hidden md:p-0">
          {loading ? (
            <div className="p-6 text-center text-sm font-bold text-slate-500">
              Caricamento prodotti...
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <div className="grid grid-cols-[130px_1fr_140px_120px_140px_160px] bg-slate-950 text-[11px] font-bold uppercase tracking-wide text-white">
                  <div className="px-3 py-2.5">Codice</div>
                  <div className="px-3 py-2.5">Prodotto</div>
                  <div className="px-3 py-2.5">Giacenza / media</div>
                  <div className="px-3 py-2.5">Min/Max</div>
                  <div className="px-3 py-2.5">Stato</div>
                  <div className="px-3 py-2.5">Ordine</div>
                </div>

                {prodottiFiltrati.map((prodotto, index) => {
                  const stato = statoSoglia(prodotto)

                  return (
                    <div
                      key={`${prodotto.id}-${index}`}
                      className={`grid grid-cols-[130px_1fr_140px_120px_140px_160px] border-b border-slate-100 last:border-b-0 ${
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
                        <div className="text-sm font-bold text-slate-700">
                          {prodotto.giacenza}
                        </div>
                        <div className="text-[10px] font-bold text-blue-600">
                          Media: {prodotto.media_storica || 0}
                        </div>
                      </div>

                      <div className="px-3 py-3 text-sm font-bold text-slate-500">
                        {prodotto.min_stock} / {prodotto.max_stock}
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

                      <div className="flex items-center border-l border-slate-100 bg-amber-50/40 px-3 py-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder={String(prodotto.consigliato || 0)}
                          value={quantita[prodotto.id] || ""}
                          disabled={!!blocco || isSaving}
                          onChange={(e) =>
                            aggiornaQuantita(
                              prodotto.id,
                              e.target.value
                            )
                          }
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-right text-sm font-semibold text-slate-900 disabled:bg-slate-200"
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
                              G: {prodotto.giacenza}
                            </span>

                            <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
                              Media: {prodotto.media_storica || 0}
                            </span>

                            <span className="rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-black text-orange-700">
                              {prodotto.min_stock}/{prodotto.max_stock}
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
                            placeholder={String(prodotto.consigliato || 0)}
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
                <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  Nessun prodotto trovato.
                </div>
              )}
            </>
          )}
        </section>

      <section className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
  <h3 className="mb-3 text-lg font-black tracking-tight text-slate-950">
    Prodotto non presente in lista
  </h3>

  <div className="space-y-3">
    {righeLibere.map((riga, index) => (
      <div
        key={index}
        className="grid grid-cols-1 gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 lg:grid-cols-12"
      >
        <input
          type="text"
          placeholder="Nome prodotto"
          value={riga.nome_prodotto}
          disabled={!!blocco || isSaving}
          onChange={(e) =>
            aggiornaLibera(index, "nome_prodotto", e.target.value)
          }
          className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-black text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600 disabled:bg-slate-200 disabled:text-slate-700 lg:col-span-4"
        />

        <input
          type="text"
          placeholder="Misure / dimensioni"
          value={riga.misura}
          disabled={!!blocco || isSaving}
          onChange={(e) =>
            aggiornaLibera(index, "misura", e.target.value)
          }
          className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-black text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600 disabled:bg-slate-200 disabled:text-slate-700 lg:col-span-4"
        />

        <div className="flex h-14 items-center gap-1 rounded-2xl border-2 border-slate-300 bg-white p-1 lg:col-span-2">
          <button
            type="button"
            onClick={() => cambiaQuantitaLibera(index, -1)}
            disabled={!!blocco || isSaving}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-800 disabled:text-slate-300"
          >
            −
          </button>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Qtà"
            value={riga.quantita}
            disabled={!!blocco || isSaving}
            onChange={(e) => aggiornaLibera(index, "quantita", e.target.value)}
            className="h-10 min-w-0 flex-1 bg-transparent text-center text-base font-black text-slate-950 outline-none disabled:text-slate-500"
          />
          <button
            type="button"
            onClick={() => cambiaQuantitaLibera(index, 1)}
            disabled={!!blocco || isSaving}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white disabled:bg-slate-300"
          >
            +
          </button>
        </div>

        <button
          onClick={() => rimuoviRigaLibera(index)}
          disabled={!!blocco || isSaving}
          className="h-14 rounded-2xl border-2 border-red-200 bg-red-50 px-3 text-sm font-black text-red-700 disabled:bg-slate-200 disabled:text-slate-500 lg:col-span-2"
        >
          Rimuovi
        </button>
      </div>
    ))}
  </div>

  <button
    onClick={aggiungiRigaLibera}
    disabled={!!blocco || isSaving}
    className="mt-3 h-14 w-full rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:bg-slate-400"
  >
    + Aggiungi prodotto non in lista
  </button>
</section>

        <button
          onClick={salvaOrdine}
          disabled={!!blocco || isSaving}
          className="hidden h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-5 text-base font-bold text-white disabled:bg-slate-400 sm:flex"
        >
          {isSaving ? "Invio ordine..." : `Salva ordine · ${numeroRigheOrdine} prodotti`}
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:hidden">
        <button
          onClick={salvaOrdine}
          disabled={!!blocco || isSaving}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-5 text-base font-bold text-white disabled:bg-slate-400"
        >
          {isSaving ? "Invio ordine..." : `Salva ordine · ${numeroRigheOrdine} prodotti`}
        </button>
      </div>
    </main>
  )
}