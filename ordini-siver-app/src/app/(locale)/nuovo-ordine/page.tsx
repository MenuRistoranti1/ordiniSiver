"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Home,
  Minus,
  PackagePlus,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { prossimaSettimana, settimanaKeyCorrente } from "@/lib/settimana"
import { useToast } from "@/components/Toast"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"

type RigaLibera = {
  nome_prodotto: string
  misura: string
  quantita: string
}

type RigaAnagrafica = {
  product_id: string
  quantita: string
}

type ProdottoAnagrafica = {
  id: string
  name: string
  supplier_code: string | null
}

type ProdottoOrdine = {
  id: string
  nome_prodotto: string
  supplier_code: string
  giacenza: number
  min_stock: number
  max_stock: number
  media_storica: number
  /* Pezzi già ordinati nelle settimane scorse e non ancora consegnati. */
  in_arrivo: number
  consigliato: number
}

export default function NuovoOrdine() {
  const { showToast } = useToast()

  const [prodotti, setProdotti] = useState<ProdottoOrdine[]>([])
  const [quantita, setQuantita] = useState<Record<string, string>>({})
  const [righeLibere, setRigheLibere] = useState<RigaLibera[]>([
    { nome_prodotto: "", misura: "", quantita: "" },
  ])

  const [prodottiExtraAnagrafica, setProdottiExtraAnagrafica] = useState<ProdottoAnagrafica[]>([])
  const [righeAnagrafica, setRigheAnagrafica] = useState<RigaAnagrafica[]>([
    { product_id: "", quantita: "" },
  ])

  const [localeId, setLocaleId] = useState("")
  const [localeNome, setLocaleNome] = useState("")
  const [operatore, setOperatore] = useState("Operatore")
  const [blocco, setBlocco] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [highlightConsigliati, setHighlightConsigliati] = useState(false)

  const [ricerca, setRicerca] = useState("")
  const [filtro, setFiltro] = useState("tutti")
  const [ordinamento, setOrdinamento] = useState("stato")
  const [soloSelezionati, setSoloSelezionati] = useState(false)
  const [riepilogoAperto, setRiepilogoAperto] = useState(false)

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

    if (user.app_metadata?.role !== "locale") {
      await supabase.auth.signOut()
      window.location.href = "/"
      return
    }

    const id =
      localStorage.getItem("locale_id") ||
      String(user.app_metadata?.locale_id || "")

    const nome =
      localStorage.getItem("locale_nome") ||
      String(user.app_metadata?.locale_nome || "")

    if (!id || !nome) {
      await supabase.auth.signOut()
      localStorage.removeItem("locale_id")
      localStorage.removeItem("locale_nome")
      localStorage.removeItem("locale_scelto")
      window.location.href = "/"
      return
    }

    setLocaleId(id)
    setLocaleNome(nome)
    setOperatore(nomeUtenteDaSessione(user))

    await Promise.all([caricaProdotti(id), controllaBloccoOrdine(id)])

    setLoading(false)
  }

  function nomeUtenteDaSessione(user: any) {
    const meta = user?.user_metadata || {}
    const app = user?.app_metadata || {}

    const nome =
      meta.full_name ||
      meta.name ||
      meta.display_name ||
      meta.nome ||
      app.full_name ||
      app.name ||
      app.nome ||
      app.operator_name ||
      ""

    if (nome && !String(nome).includes("@")) return String(nome).trim()

    const email = String(user?.email || "")
    const localPart = email.split("@")[0] || "Operatore"

    return localPart
      .replace(/[._-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(" ")
  }

  function salutoOrario() {
    const ora = new Date().getHours()
    if (ora >= 5 && ora < 13) return "Buongiorno"
    if (ora >= 13 && ora < 18) return "Buon pomeriggio"
    return "Buonasera"
  }




  async function controllaBloccoOrdine(id: string) {
    const settimanaKey = settimanaKeyCorrente()
    const prossimo = prossimaSettimana().toLocaleDateString("it-IT", { timeZone: "UTC" })

    const { data: giacenze } = await supabase
      .from("giacenze_settimana")
      .select("id")
      .eq("locale_id", id)
      .eq("settimana_key", settimanaKey)
      .limit(1)

    if (!giacenze || giacenze.length === 0) {
      setBlocco("Prima di effettuare un ordine devi inserire le giacenze della settimana.")
      return
    }

    const { data: ordini } = await supabase
      .from("ordini")
      .select("id")
      .eq("locale_id", id)
      .eq("settimana_key", settimanaKey)
      .limit(1)

    if (Array.isArray(ordini) && ordini.length > 0) {
      setBlocco(
        `Hai già inviato l'ordine di questa settimana. Potrai effettuare un nuovo ordine da lunedì ${prossimo}.`
      )
    }
  }

  async function caricaProdotti(id: string) {
    const { data: impostazioni, error: errorImpostazioni } = await supabase
      .from("restaurant_product_settings")
      .select("id, active, min_stock, max_stock, prodotto_id, product_id")
      .eq("restaurant_id", id)
      .eq("active", true)

    if (errorImpostazioni) {
      console.log("Errore impostazioni:", errorImpostazioni)
      showToast("Errore caricamento prodotti", "error")
      return
    }

    const idsProdotti = (impostazioni || [])
      .map((item: any) => item.prodotto_id || item.product_id)
      .filter(Boolean)

    if (idsProdotti.length === 0) {
      setProdotti([])
      setQuantita({})
      return
    }

    const { data: prodottiDb, error: errorProdotti } = await supabase
      .from("products")
      .select("id, name, supplier_code, active")
      .in("id", idsProdotti)
      .eq("active", true)

    if (errorProdotti) {
      console.log("Errore prodotti:", errorProdotti)
      showToast("Errore caricamento prodotti", "error")
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
      .select("nome_prodotto, quantita, created_at, settimana_key")
      .eq("locale_id", id)
      .order("created_at", { ascending: false })

    if (errorGiacenze) {
      console.log("Errore giacenze:", errorGiacenze)
      showToast("Errore caricamento giacenze", "error")
      return
    }

    const { data: storicoOrdini, error: errorStorico } = await supabase
      .from("ordini")
      .select("nome_prodotto, quantita, created_at")
      .eq("locale_id", id)
      .order("created_at", { ascending: false })

    if (errorStorico) console.log("Errore storico ordini:", errorStorico)

    /*
      Righe delle settimane precedenti ancora scoperte: è merce già ordinata e
      non ancora arrivata. Senza questo dato il responsabile riordinerebbe
      prodotti che stanno per essere consegnati, e il fornitore li manderebbe
      due volte.
    */
    const { data: ordiniAperti } = await supabase
      .from("ordini")
      .select("supplier_code, quantita, quantita_consegnata, stato_consegna, settimana_key")
      .eq("locale_id", id)
      .neq("settimana_key", settimanaKeyCorrente())

    const inArrivoPerCodice = new Map<string, number>()

    for (const riga of ordiniAperti || []) {
      if (riga.stato_consegna === "annullato") continue

      const residuo =
        Number(riga.quantita || 0) - Number(riga.quantita_consegnata || 0)

      if (residuo <= 0) continue

      const codice = String(riga.supplier_code || "").toUpperCase().trim()
      if (!codice) continue

      inArrivoPerCodice.set(codice, (inArrivoPerCodice.get(codice) || 0) + residuo)
    }

    const prodottiFormattati = (impostazioni || [])
      .map((item: any) => {
        const idProdotto = item.prodotto_id || item.product_id
        const prodotto = prodottiPuliti.find((p: any) => String(p.id) === String(idProdotto))

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
            ? ultime4.reduce((sum: number, o: any) => sum + Number(o.quantita || 0), 0) /
              ultime4.length
            : 0

        const codiceProdotto = String(prodotto?.supplier_code || "").toUpperCase().trim()
        const inArrivo = inArrivoPerCodice.get(codiceProdotto) || 0

        const consigliatoStorico = qtaGiacenza < mediaStorica ? Math.ceil(mediaStorica - qtaGiacenza) : 0
        const consigliatoSoglia = max > 0 && qtaGiacenza < min ? max - qtaGiacenza : 0

        // Ciò che sta già arrivando copre parte del fabbisogno: va scalato dal
        // consiglio, altrimenti si ordina due volte la stessa merce.
        const consigliato = Math.max(
          0,
          Math.max(consigliatoStorico, consigliatoSoglia) - inArrivo,
        )

        return {
          id: String(idProdotto),
          nome_prodotto: nomeProdotto,
          supplier_code: prodotto?.supplier_code || "-",
          giacenza: qtaGiacenza,
          min_stock: min,
          max_stock: max,
          media_storica: Math.ceil(mediaStorica),
          in_arrivo: inArrivo,
          consigliato,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) =>
        String(a.nome_prodotto || "").localeCompare(String(b.nome_prodotto || ""))
      ) as ProdottoOrdine[]

    const qtaIniziali: Record<string, string> = {}

    prodottiFormattati.forEach((p) => {
      if (p.consigliato > 0) qtaIniziali[p.id] = String(p.consigliato)
    })

    const idsListaLocale = new Set(prodottiFormattati.map((p) => String(p.id)))

    const { data: prodottiExtraDb, error: errorExtra } = await supabase
      .from("products")
      .select("id, name, supplier_code, active")
      .eq("active", true)
      .order("name", { ascending: true })

    if (errorExtra) {
      console.log("Errore prodotti extra:", errorExtra)
      showToast("Errore caricamento prodotti anagrafica", "error")
    }

    const extraPuliti = (prodottiExtraDb || [])
      .filter((p: any) => !idsListaLocale.has(String(p.id)))
      .filter((p: any) => {
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
      .map((p: any) => ({
        id: String(p.id),
        name: p.name || "Prodotto",
        supplier_code: p.supplier_code || "-",
      }))

    setProdotti(prodottiFormattati)
    setProdottiExtraAnagrafica(extraPuliti)
    setQuantita(qtaIniziali)
  }

  function statoSoglia(prodotto: ProdottoOrdine) {
    const qta = Number(prodotto.giacenza || 0)
    const min = Number(prodotto.min_stock || 0)
    const max = Number(prodotto.max_stock || 0)

    if (min > 0 && qta < min) return "Sotto soglia"
    if (max > 0 && qta > max) return "Sopra soglia"
    return "Corretto"
  }

  function classeStato(stato: string) {
    if (stato === "Sotto soglia") return "border-red-200 bg-red-50 text-red-700"
    if (stato === "Sopra soglia") return "border-orange-200 bg-orange-50 text-orange-700"
    return "border-green-200 bg-green-50 text-green-700"
  }

  function targetProdotto(prodotto: ProdottoOrdine) {
    if (Number(prodotto.max_stock || 0) > 0) return Number(prodotto.max_stock || 0)
    if (Number(prodotto.media_storica || 0) > 0) return Number(prodotto.media_storica || 0)
    return 0
  }

  function aggiornaQuantita(idProdotto: string, valore: string) {
    setQuantita((attuale) => ({ ...attuale, [idProdotto]: valore }))
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
    setRigheLibere([...righeLibere, { nome_prodotto: "", misura: "", quantita: "" }])
  }

  function rimuoviRigaLibera(index: number) {
    if (righeLibere.length === 1) {
      setRigheLibere([{ nome_prodotto: "", misura: "", quantita: "" }])
      return
    }
    setRigheLibere(righeLibere.filter((_, i) => i !== index))
  }

  function aggiornaRigaAnagrafica(index: number, campo: keyof RigaAnagrafica, valore: string) {
    const nuoveRighe = [...righeAnagrafica]
    nuoveRighe[index] = { ...nuoveRighe[index], [campo]: valore }
    setRigheAnagrafica(nuoveRighe)
  }

  function aggiungiRigaAnagrafica() {
    setRigheAnagrafica([...righeAnagrafica, { product_id: "", quantita: "" }])
  }

  function rimuoviRigaAnagrafica(index: number) {
    if (righeAnagrafica.length === 1) {
      setRigheAnagrafica([{ product_id: "", quantita: "" }])
      return
    }

    setRigheAnagrafica(righeAnagrafica.filter((_, i) => i !== index))
  }

  function cambiaQuantitaAnagrafica(index: number, variazione: number) {
    const attuale = Number(righeAnagrafica[index]?.quantita || 0)
    const nuova = Math.max(0, attuale + variazione)
    aggiornaRigaAnagrafica(index, "quantita", nuova === 0 ? "" : String(nuova))
  }

  function prodottoAnagraficaSelezionato(productId: string) {
    return prodottiExtraAnagrafica.find((p) => String(p.id) === String(productId))
  }

  function applicaConsigliati() {
    const nuove: Record<string, string> = {}

    prodotti.forEach((p) => {
      if (p.consigliato > 0) nuove[p.id] = String(p.consigliato)
    })

    setQuantita(nuove)
    setHighlightConsigliati(true)
    window.setTimeout(() => setHighlightConsigliati(false), 700)
    showToast("Quantità consigliate applicate", "success")
  }

  function svuotaOrdine() {
    setQuantita({})
    setRigheAnagrafica([{ product_id: "", quantita: "" }])
    setRigheLibere([{ nome_prodotto: "", misura: "", quantita: "" }])
    showToast("Ordine svuotato", "success")
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

    if (filtro !== "tutti") lista = lista.filter((p) => statoSoglia(p) === filtro)
    if (soloSelezionati) lista = lista.filter((p) => Number(quantita[p.id] || 0) > 0)

    if (ordinamento === "nome") lista.sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto))
    if (ordinamento === "codice") {
      lista.sort((a, b) => String(a.supplier_code || "").localeCompare(String(b.supplier_code || "")))
    }
    if (ordinamento === "consigliato") {
      lista.sort((a, b) => Number(b.consigliato || 0) - Number(a.consigliato || 0))
    }
    if (ordinamento === "stato") {
      const peso: Record<string, number> = { "Sotto soglia": 1, Corretto: 2, "Sopra soglia": 3 }
      lista.sort((a, b) => peso[statoSoglia(a)] - peso[statoSoglia(b)])
    }

    return lista
  }, [prodotti, ricerca, filtro, ordinamento, soloSelezionati, quantita])

  const prodottiSelezionati = prodotti.filter((p) => Number(quantita[p.id] || 0) > 0)

  const righeAnagraficaSelezionate = righeAnagrafica
    .filter((riga) => riga.product_id && Number(riga.quantita || 0) > 0)
    .map((riga) => ({
      ...riga,
      prodotto: prodottoAnagraficaSelezionato(riga.product_id),
    }))
    .filter((riga) => !!riga.prodotto)

  const righeLibereSelezionate = righeLibere.filter(
    (riga) => riga.nome_prodotto.trim() && riga.misura.trim() && Number(riga.quantita || 0) > 0
  )

  const numeroRigheOrdine =
    prodottiSelezionati.length +
    righeAnagraficaSelezionate.length +
    righeLibereSelezionate.length

  const quantitaTotaleOrdine =
    prodottiSelezionati.reduce((totale, p) => totale + Number(quantita[p.id] || 0), 0) +
    righeAnagraficaSelezionate.reduce((totale, riga) => totale + Number(riga.quantita || 0), 0) +
    righeLibereSelezionate.reduce((totale, riga) => totale + Number(riga.quantita || 0), 0)

  const prodottiSottoSoglia = prodotti.filter((p) => statoSoglia(p) === "Sotto soglia").length
  const consigliatiDisponibili = prodotti.filter((p) => Number(p.consigliato || 0) > 0).length

  // Merce già ordinata nelle settimane scorse e non ancora arrivata.
  const prodottiInArrivo = prodotti.filter((p) => Number(p.in_arrivo || 0) > 0)
  const pezziInArrivo = prodottiInArrivo.reduce(
    (somma, p) => somma + Number(p.in_arrivo || 0),
    0,
  )

  async function salvaOrdine() {
    if (isSaving) return

    if (!localeId || !localeNome) {
      showToast("Sessione locale non valida. Effettua di nuovo il login.", "error")
      await supabase.auth.signOut()
      window.location.href = "/"
      return
    }

    if (blocco) {
      showToast(blocco, "warning")
      return
    }

    const anagraficaIncomplete = righeAnagrafica.some(
      (riga) =>
        (riga.product_id || riga.quantita) &&
        (!riga.product_id || !riga.quantita || Number(riga.quantita) <= 0)
    )

    if (anagraficaIncomplete) {
      showToast("Per i prodotti da anagrafica devi selezionare prodotto e quantità", "warning")
      return
    }

    const idsAnagrafica = righeAnagraficaSelezionate.map((riga) => riga.product_id)
    const idsDuplicati = idsAnagrafica.filter((id, index) => idsAnagrafica.indexOf(id) !== index)

    if (idsDuplicati.length > 0) {
      showToast("Hai selezionato due volte lo stesso prodotto da anagrafica", "warning")
      return
    }

    const libereIncomplete = righeLibere.some(
      (riga) =>
        (riga.nome_prodotto.trim() || riga.misura.trim() || riga.quantita) &&
        (!riga.nome_prodotto.trim() || !riga.misura.trim() || !riga.quantita || Number(riga.quantita) <= 0)
    )

    if (libereIncomplete) {
      showToast("Per i prodotti fuori anagrafica devi inserire nome, misure e quantità", "warning")
      return
    }

    const settimanaKey = settimanaKeyCorrente()

    const righeProdotti = prodotti
      .filter((p) => quantita[p.id] && Number(quantita[p.id]) > 0)
      .map((p) => ({
        locale_id: localeId,
        locale_nome: localeNome,
        responsabile: operatore,
        nome_prodotto: p.nome_prodotto,
        supplier_code: p.supplier_code || "",
        misure: "",
        quantita: Number(quantita[p.id]),
        settimana_key: settimanaKey,
      }))

    const righeAnagraficaValide = righeAnagraficaSelezionate.map((riga) => ({
      locale_id: localeId,
      locale_nome: localeNome,
      responsabile: operatore,
      nome_prodotto: riga.prodotto?.name || "Prodotto",
      supplier_code: riga.prodotto?.supplier_code || "",
      misure: "",
      quantita: Number(riga.quantita),
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
        responsabile: operatore,
        nome_prodotto: riga.nome_prodotto.trim(),
        supplier_code: "",
        misure: riga.misura.trim(),
        quantita: Number(riga.quantita),
        settimana_key: settimanaKey,
      }))

    const righeOrdine = [...righeProdotti, ...righeAnagraficaValide, ...righeLibereValide]

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

  function KpiCard({ label, value, note }: { label: string; value: string | number; note: string }) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{note}</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-28 pt-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <LocaleMobileHeader />

        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">Nuovo ordine settimanale</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {salutoOrario()} {operatore}
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {localeNome || "Locale"} · ordine consigliato con soglie, giacenze e media storica
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[680px]">
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard")}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition-all hover:bg-slate-800 disabled:bg-slate-400"
              >
                <Home className="h-5 w-5" />
                Home
              </button>

              <div className="rounded-2xl bg-blue-50 p-3">
                <p className="text-[11px] font-black uppercase text-blue-600">Prodotti</p>
                <p className="mt-1 text-2xl font-black text-blue-800">{numeroRigheOrdine}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase text-slate-500">Pezzi</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{quantitaTotaleOrdine}</p>
              </div>
              <div className="col-span-2 rounded-2xl bg-emerald-50 p-3 sm:col-span-1">
                <p className="text-[11px] font-black uppercase text-emerald-700">Consigliati</p>
                <p className="mt-1 text-2xl font-black text-emerald-800">{consigliatiDisponibili}</p>
              </div>
            </div>
          </div>
        </header>

        {prodottiInArrivo.length > 0 && (
          <section className="rounded-3xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div className="min-w-0">
                <p className="text-sm font-black text-amber-900">
                  {pezziInArrivo} pezzi sono già stati ordinati e non sono ancora
                  arrivati
                </p>
                <p className="mt-1 text-xs font-bold text-amber-800">
                  Riguardano {prodottiInArrivo.length} prodotti delle settimane
                  precedenti. Le quantità consigliate ne tengono già conto:
                  controlla prima di riordinarli, o arriveranno due volte.
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {prodottiInArrivo.map((p) => (
                    <span
                      key={p.id}
                      className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-[11px] font-black text-amber-900"
                    >
                      {p.nome_prodotto}: {p.in_arrivo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {blocco && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-800 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{blocco}</span>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_180px_220px_220px_170px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca prodotto o codice..."
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
              />
            </div>

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
            >
              <option value="tutti">Tutti</option>
              <option value="Sotto soglia">Sotto soglia</option>
              <option value="Corretto">Corretto</option>
              <option value="Sopra soglia">Sopra soglia</option>
            </select>

            <select
              value={ordinamento}
              onChange={(e) => setOrdinamento(e.target.value)}
              className="h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
            >
              <option value="stato">Ordina per stato</option>
              <option value="consigliato">Ordina per consigliato</option>
              <option value="nome">Ordina per nome</option>
              <option value="codice">Ordina per codice</option>
            </select>

            <button
              type="button"
              onClick={() => setSoloSelezionati(!soloSelezionati)}
              className={`inline-flex h-14 items-center justify-center rounded-2xl border-2 px-4 text-sm font-black transition-all ${
                soloSelezionati
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-100 bg-blue-50 text-blue-700"
              }`}
            >
              {soloSelezionati ? "Solo selezionati attivo" : `Solo selezionati (${numeroRigheOrdine})`}
            </button>

            <button
              type="button"
              onClick={() => setRiepilogoAperto(!riepilogoAperto)}
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white"
            >
              {riepilogoAperto ? "Chiudi riepilogo" : "Riepilogo"}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={applicaConsigliati}
              disabled={!!blocco || isSaving || loading}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 text-sm font-black text-white disabled:bg-slate-400"
            >
              <Sparkles className="h-5 w-5" />
              Applica ordine consigliato
            </button>

            <button
              onClick={svuotaOrdine}
              disabled={!!blocco || isSaving || loading}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-black text-white disabled:bg-slate-400"
            >
              <RotateCcw className="h-5 w-5" />
              Svuota quantità
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Prodotti selezionati" value={numeroRigheOrdine} note="Righe che verranno inviate" />
          <KpiCard label="Quantità totale" value={quantitaTotaleOrdine} note="Pezzi complessivi ordine" />
          <KpiCard label="Sotto soglia" value={prodottiSottoSoglia} note="Prodotti da reintegrare" />
        </section>

        {riepilogoAperto && (
          <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">Riepilogo ordine</p>
                <h2 className="text-xl font-black text-slate-950">
                  {numeroRigheOrdine} prodotti · {quantitaTotaleOrdine} pezzi
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {prodottiSelezionati.map((prodotto) => (
                <div key={prodotto.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900">{prodotto.nome_prodotto}</p>
                    <p className="text-[10px] font-bold text-slate-500">{prodotto.supplier_code || "-"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-950 shadow-sm">
                      {quantita[prodotto.id]}
                    </span>
                    <button
                      type="button"
                      onClick={() => aggiornaQuantita(prodotto.id, "")}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-lg font-black text-red-700"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              {righeAnagraficaSelezionate.map((riga, index) => (
                <div key={`${riga.product_id}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-blue-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900">{riga.prodotto?.name}</p>
                    <p className="text-[10px] font-bold text-blue-700">Da anagrafica · {riga.prodotto?.supplier_code || "-"}</p>
                  </div>
                  <span className="rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-950 shadow-sm">
                    {riga.quantita}
                  </span>
                </div>
              ))}

              {righeLibereSelezionate.map((riga, index) => (
                <div key={`${riga.nome_prodotto}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900">{riga.nome_prodotto}</p>
                    <p className="text-[10px] font-bold text-amber-700">Fuori anagrafica · {riga.misura}</p>
                  </div>
                  <span className="rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-950 shadow-sm">
                    {riga.quantita}
                  </span>
                </div>
              ))}

              {numeroRigheOrdine === 0 && <p className="text-sm font-bold text-slate-500">Nessun prodotto selezionato.</p>}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">Caricamento prodotti...</div>
          ) : (
            <>
              <div className="hidden bg-slate-950 text-[11px] font-black uppercase tracking-wide text-white lg:grid lg:grid-cols-[140px_1fr_160px_160px_160px_190px]">
                <div className="px-4 py-3">Codice</div>
                <div className="px-4 py-3">Prodotto</div>
                <div className="px-4 py-3 text-right">Attuale</div>
                <div className="px-4 py-3 text-right">Obiettivo</div>
                <div className="px-4 py-3">Stato</div>
                <div className="px-4 py-3 text-center">Ordine</div>
              </div>

              <div className="hidden lg:block">
                {prodottiFiltrati.map((prodotto, index) => {
                  const stato = statoSoglia(prodotto)
                  const qta = quantita[prodotto.id] || ""

                  return (
                    <div
                      key={`${prodotto.id}-${index}`}
                      className={`grid grid-cols-[140px_1fr_160px_160px_160px_190px] items-center border-b border-slate-100 last:border-b-0 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50"
                      } ${highlightConsigliati && Number(qta || 0) > 0 ? "ring-2 ring-inset ring-green-200" : ""}`}
                    >
                      <div className="px-4 py-4 text-xs font-black text-slate-500">{prodotto.supplier_code || "-"}</div>

                      <div className="min-w-0 px-4 py-4">
                        <p className="truncate text-sm font-black text-slate-950">{prodotto.nome_prodotto}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-500">Media storica: {prodotto.media_storica || 0}</p>

                        {prodotto.in_arrivo > 0 && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-800">
                            già ordinati e non arrivati: {prodotto.in_arrivo}
                          </span>
                        )}
                      </div>

                      <div className="px-4 py-4 text-right">
                        <p className="text-xl font-black text-slate-950">{prodotto.giacenza}</p>
                        <p className="text-[11px] font-bold text-slate-500">Giacenza</p>
                      </div>

                      <div className="px-4 py-4 text-right">
                        <p className="text-xl font-black text-slate-950">{targetProdotto(prodotto)}</p>
                        <p className="text-[11px] font-bold text-slate-500">Min/Max {prodotto.min_stock}/{prodotto.max_stock}</p>
                      </div>

                      <div className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black uppercase ${classeStato(stato)}`}>
                          {stato === "Corretto" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {stato}
                        </span>
                      </div>

                      <div className="bg-amber-50/40 px-4 py-3">
                        <div className="flex h-12 items-center justify-between gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                          <button
                            type="button"
                            onClick={() => cambiaQuantita(prodotto.id, -1)}
                            disabled={!!blocco || isSaving}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 disabled:text-slate-300"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder={String(prodotto.consigliato || 0)}
                            value={qta}
                            disabled={!!blocco || isSaving}
                            onChange={(e) => aggiornaQuantita(prodotto.id, e.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-center text-lg font-black text-slate-950 outline-none disabled:text-slate-500"
                          />

                          <button
                            type="button"
                            onClick={() => cambiaQuantita(prodotto.id, 1)}
                            disabled={!!blocco || isSaving}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white disabled:bg-slate-300"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-3 p-3 lg:hidden">
                {prodottiFiltrati.map((prodotto, index) => {
                  const stato = statoSoglia(prodotto)
                  const qta = quantita[prodotto.id] || ""

                  return (
                    <div key={`${prodotto.id}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-slate-500">{prodotto.supplier_code || "-"}</p>
                          <h3 className="mt-1 text-sm font-black leading-tight text-slate-950">{prodotto.nome_prodotto}</h3>

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-slate-50 p-2">
                              <p className="text-[10px] font-black uppercase text-slate-500">Attuale</p>
                              <p className="text-lg font-black text-slate-950">{prodotto.giacenza}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-2">
                              <p className="text-[10px] font-black uppercase text-slate-500">Target</p>
                              <p className="text-lg font-black text-slate-950">{targetProdotto(prodotto)}</p>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">Media {prodotto.media_storica || 0}</span>
                            {prodotto.in_arrivo > 0 && (
                              <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-800">
                                in arrivo {prodotto.in_arrivo}
                              </span>
                            )}
                            <span className="rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-black text-orange-700">Min/Max {prodotto.min_stock}/{prodotto.max_stock}</span>
                            <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase ${classeStato(stato)}`}>{stato}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex h-14 items-center justify-between gap-1 rounded-2xl border-2 border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => cambiaQuantita(prodotto.id, -1)}
                          disabled={!!blocco || isSaving}
                          className="flex h-11 w-12 items-center justify-center rounded-xl bg-white text-xl font-black text-slate-800 shadow-sm disabled:text-slate-300"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder={String(prodotto.consigliato || 0)}
                          value={qta}
                          disabled={!!blocco || isSaving}
                          onChange={(e) => aggiornaQuantita(prodotto.id, e.target.value)}
                          className="h-11 min-w-0 flex-1 bg-transparent text-center text-xl font-black text-slate-950 outline-none disabled:text-slate-500"
                        />

                        <button
                          type="button"
                          onClick={() => cambiaQuantita(prodotto.id, 1)}
                          disabled={!!blocco || isSaving}
                          className="flex h-11 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white shadow-sm disabled:bg-slate-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {prodottiFiltrati.length === 0 && (
                <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Nessun prodotto trovato.</div>
              )}
            </>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-2xl bg-blue-700 p-2 text-white">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-950">Prodotti da anagrafica generale</h3>
              <p className="text-sm font-bold text-slate-500">
                Seleziona prodotti presenti in anagrafica ma non nella lista base del locale.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {righeAnagrafica.map((riga, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-12">
                <select
                  value={riga.product_id}
                  disabled={!!blocco || isSaving}
                  onChange={(e) => aggiornaRigaAnagrafica(index, "product_id", e.target.value)}
                  className="h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-black text-slate-950 outline-none focus:border-blue-600 disabled:bg-slate-200 disabled:text-slate-700 lg:col-span-7"
                >
                  <option value="">Seleziona prodotto da anagrafica...</option>
                  {prodottiExtraAnagrafica.map((prodotto) => (
                    <option key={prodotto.id} value={prodotto.id}>
                      {prodotto.name} {prodotto.supplier_code ? `· ${prodotto.supplier_code}` : ""}
                    </option>
                  ))}
                </select>

                <div className="flex h-14 items-center gap-1 rounded-2xl border-2 border-slate-200 bg-white p-1 lg:col-span-3">
                  <button
                    type="button"
                    onClick={() => cambiaQuantitaAnagrafica(index, -1)}
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
                    onChange={(e) => aggiornaRigaAnagrafica(index, "quantita", e.target.value)}
                    className="h-10 min-w-0 flex-1 bg-transparent text-center text-base font-black text-slate-950 outline-none disabled:text-slate-500"
                  />

                  <button
                    type="button"
                    onClick={() => cambiaQuantitaAnagrafica(index, 1)}
                    disabled={!!blocco || isSaving}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white disabled:bg-slate-300"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => rimuoviRigaAnagrafica(index)}
                  disabled={!!blocco || isSaving}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-red-100 bg-red-50 px-3 text-sm font-black text-red-700 disabled:bg-slate-200 disabled:text-slate-500 lg:col-span-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Rimuovi
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={aggiungiRigaAnagrafica}
            disabled={!!blocco || isSaving}
            className="mt-3 h-14 w-full rounded-2xl bg-blue-700 px-4 text-sm font-black text-white disabled:bg-slate-400"
          >
            + Aggiungi prodotto da anagrafica
          </button>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-2xl bg-slate-950 p-2 text-white">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-950">Prodotti fuori anagrafica</h3>
              <p className="text-sm font-bold text-slate-500">Usa questa sezione solo per articoli non presenti nella lista principale.</p>
            </div>
          </div>

          <div className="space-y-3">
            {righeLibere.map((riga, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-12">
                <input
                  type="text"
                  placeholder="Nome prodotto"
                  value={riga.nome_prodotto}
                  disabled={!!blocco || isSaving}
                  onChange={(e) => aggiornaLibera(index, "nome_prodotto", e.target.value)}
                  className="h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-black text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600 disabled:bg-slate-200 disabled:text-slate-700 lg:col-span-4"
                />

                <input
                  type="text"
                  placeholder="Misure / dimensioni"
                  value={riga.misura}
                  disabled={!!blocco || isSaving}
                  onChange={(e) => aggiornaLibera(index, "misura", e.target.value)}
                  className="h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-black text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600 disabled:bg-slate-200 disabled:text-slate-700 lg:col-span-4"
                />

                <div className="flex h-14 items-center gap-1 rounded-2xl border-2 border-slate-200 bg-white p-1 lg:col-span-2">
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
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-red-100 bg-red-50 px-3 text-sm font-black text-red-700 disabled:bg-slate-200 disabled:text-slate-500 lg:col-span-2"
                >
                  <Trash2 className="h-4 w-4" />
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
            + Aggiungi prodotto fuori anagrafica
          </button>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:items-center sm:gap-4">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500">Prodotti</p>
              <p className="font-black text-slate-950">{numeroRigheOrdine}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500">Pezzi</p>
              <p className="font-black text-slate-950">{quantitaTotaleOrdine}</p>
            </div>
          </div>

          <button
            onClick={salvaOrdine}
            disabled={!!blocco || isSaving || loading}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 text-base font-black text-white shadow-lg shadow-blue-700/20 disabled:bg-slate-400"
          >
            <Send className="h-5 w-5" />
            {isSaving ? "Invio ordine..." : `Invia ordine · ${numeroRigheOrdine} prodotti`}
          </button>
        </div>
      </div>
    </main>
  )
}