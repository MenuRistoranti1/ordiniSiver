"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Ban,
  Bell,
  CheckCircle,
  CheckCircle2,
  FileText,
  Home,
  Mail,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Tag,
  Truck,
  TrendingUp,
  XCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type AlertItem = {
  id: string
  tipo: string
  gruppo: "operativo" | "fatture" | "anagrafica" | "magazzino" | "consumi"
  gravita: "alta" | "media" | "bassa"
  titolo: string
  descrizione: string
  locale_nome?: string
  email?: string
  settimana_key?: string
  link?: string
}

export default function AdminAlert() {
  const [locali, setLocali] = useState<any[]>([])
  const [giacenze, setGiacenze] = useState<any[]>([])
  const [ordini, setOrdini] = useState<any[]>([])
  const [ordiniStorici, setOrdiniStorici] = useState<any[]>([])
  const [alertLog, setAlertLog] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [invoiceImports, setInvoiceImports] = useState<any[]>([])
  const [invoiceRows, setInvoiceRows] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [ricerca, setRicerca] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("tutti")
  const [filtroGruppo, setFiltroGruppo] = useState("tutti")
  const [errore, setErrore] = useState("")

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

    caricaDati()
  }, [])

  function getSettimanaKey() {
    const oggi = new Date()
    const giorno = oggi.getDay()
    const diff = giorno >= 6 ? giorno - 6 : giorno + 1
    const sabato = new Date(oggi)

    sabato.setDate(oggi.getDate() - diff)
    sabato.setHours(0, 0, 0, 0)

    return sabato.toISOString().split("T")[0]
  }

  function normalizza(testo: string) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  function normalizzaCodice(codice: string) {
    return String(codice || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
  }

  function numero(valore: any) {
    const n = Number(String(valore || "0").replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }

  async function caricaDati() {
    setLoading(true)
    setErrore("")

    const settimanaKey = getSettimanaKey()

    try {
      const [
        localiRes,
        giacenzeRes,
        ordiniRes,
        ordiniStoriciRes,
        alertRes,
        productsRes,
        invoicesRes,
        invoiceRowsRes,
      ] = await Promise.all([
        supabase.from("restaurants").select("id, name, email").order("name"),
        supabase
          .from("giacenze_settimana")
          .select("*")
          .eq("settimana_key", settimanaKey),
        supabase.from("ordini").select("*").eq("settimana_key", settimanaKey),
        supabase
          .from("ordini")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("alert_log")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id, name, supplier_code, price, active")
          .order("name"),
        supabase
          .from("invoice_imports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("invoice_import_rows")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      ])

      if (localiRes.error) throw localiRes.error
      if (giacenzeRes.error) throw giacenzeRes.error
      if (ordiniRes.error) throw ordiniRes.error
      if (ordiniStoriciRes.error) throw ordiniStoriciRes.error
      if (alertRes.error) throw alertRes.error
      if (productsRes.error) throw productsRes.error
      if (invoicesRes.error) throw invoicesRes.error
      if (invoiceRowsRes.error) throw invoiceRowsRes.error

      setLocali(localiRes.data || [])
      setGiacenze(giacenzeRes.data || [])
      setOrdini(ordiniRes.data || [])
      setOrdiniStorici(ordiniStoriciRes.data || [])
      setAlertLog(alertRes.data || [])
      setProducts(productsRes.data || [])
      setInvoiceImports(invoicesRes.data || [])
      setInvoiceRows(invoiceRowsRes.data || [])
    } catch (error: any) {
      console.log(error)
      setErrore(error?.message || "Errore caricamento alert")
    }

    setLoading(false)
  }

  function logout() {
    localStorage.removeItem("admin")
    window.location.href = "/"
  }

  const invoicesById = useMemo(() => {
    const map = new Map<string, any>()
    invoiceImports.forEach((invoice) => map.set(String(invoice.id), invoice))
    return map
  }, [invoiceImports])

  const prodottiByCode = useMemo(() => {
    const map = new Map<string, any>()
    products.forEach((p) => {
      const codice = normalizzaCodice(p.supplier_code || "")
      if (codice) map.set(codice, p)
    })
    return map
  }, [products])

  const ordiniById = useMemo(() => {
    const map = new Map<string, any>()
    ordiniStorici.forEach((ordine) => map.set(String(ordine.id), ordine))
    return map
  }, [ordiniStorici])

  const alertCorrenti = useMemo(() => {
    const settimanaKey = getSettimanaKey()
    const lista: AlertItem[] = []

    locali.forEach((locale) => {
      const haGiacenza = giacenze.some(
        (g) => String(g.locale_id) === String(locale.id)
      )
      const haOrdine = ordini.some(
        (o) => String(o.locale_id) === String(locale.id)
      )

      if (!haGiacenza) {
        lista.push({
          id: `giacenza-${locale.id}`,
          tipo: "giacenza",
          gruppo: "operativo",
          gravita: "alta",
          titolo: "Giacenza mancante",
          descrizione: `${locale.name} non ha inserito le giacenze della settimana.`,
          locale_nome: locale.name,
          email: locale.email,
          settimana_key: settimanaKey,
        })
      }

      if (!haOrdine) {
        lista.push({
          id: `ordine-${locale.id}`,
          tipo: "ordine",
          gruppo: "operativo",
          gravita: "media",
          titolo: "Ordine mancante",
          descrizione: `${locale.name} non ha inviato l'ordine della settimana.`,
          locale_nome: locale.name,
          email: locale.email,
          settimana_key: settimanaKey,
        })
      }

      const storicoLocale = ordiniStorici.filter(
        (o) => String(o.locale_id) === String(locale.id)
      )

      if (storicoLocale.length === 0) {
        lista.push({
          id: `inattivo-${locale.id}`,
          tipo: "inattivo",
          gruppo: "operativo",
          gravita: "media",
          titolo: "Locale inattivo",
          descrizione: `${locale.name} non ha storico ordini registrato.`,
          locale_nome: locale.name,
          email: locale.email,
          settimana_key: settimanaKey,
        })
      }
    })

    ordini.forEach((ordine) => {
      const ordinata = Number(ordine.quantita || 0)
      const consegnata = Number(ordine.quantita_consegnata || 0)
      const stato = ordine.stato_consegna || "da_consegnare"

      if (!normalizzaCodice(ordine.supplier_code || "")) {
        lista.push({
          id: `ordine-senza-codice-${ordine.id}`,
          tipo: "ordine_senza_codice",
          gruppo: "anagrafica",
          gravita: "alta",
          titolo: "Ordine senza codice prodotto",
          descrizione: `${ordine.locale_nome || "Locale"} · ${
            ordine.nome_prodotto || "Prodotto"
          } non ha supplier_code salvato.`,
          locale_nome: ordine.locale_nome,
          settimana_key: ordine.settimana_key,
        })
      }

      if (stato === "parziale" || (consegnata > 0 && consegnata < ordinata)) {
        lista.push({
          id: `parziale-${ordine.id}`,
          tipo: "consegna",
          gruppo: "operativo",
          gravita: "media",
          titolo: "Consegna parziale",
          descrizione: `${ordine.locale_nome} · ${ordine.nome_prodotto}: consegnati ${consegnata} su ${ordinata}.`,
          locale_nome: ordine.locale_nome,
          settimana_key: ordine.settimana_key,
        })
      }

      if (stato === "da_consegnare" && ordinata > 0) {
        lista.push({
          id: `inevasa-${ordine.id}`,
          tipo: "consegna",
          gruppo: "operativo",
          gravita: "alta",
          titolo: "Consegna non evasa",
          descrizione: `${ordine.locale_nome} · ${ordine.nome_prodotto}: ancora da consegnare.`,
          locale_nome: ordine.locale_nome,
          settimana_key: ordine.settimana_key,
        })
      }
    })

    ordini.forEach((ordine) => {
      const storicoProdotto = ordiniStorici
        .filter(
          (o) =>
            String(o.locale_id) === String(ordine.locale_id) &&
            normalizza(o.nome_prodotto || "") ===
              normalizza(ordine.nome_prodotto || "") &&
            String(o.settimana_key) !== String(ordine.settimana_key)
        )
        .slice(0, 4)

      if (storicoProdotto.length < 2) return

      const media =
        storicoProdotto.reduce(
          (sum, item) => sum + Number(item.quantita || 0),
          0
        ) / storicoProdotto.length

      const quantitaAttuale = Number(ordine.quantita || 0)

      if (media > 0 && quantitaAttuale >= media * 2) {
        const aumento = Math.round(((quantitaAttuale - media) / media) * 100)
        lista.push({
          id: `anomalo-${ordine.id}`,
          tipo: "anomalia",
          gruppo: "consumi",
          gravita: "alta",
          titolo: "Consumo anomalo",
          descrizione: `${ordine.locale_nome} · ${ordine.nome_prodotto}: ordine ${quantitaAttuale}, media ${Math.round(
            media
          )}. Aumento +${aumento}%.`,
          locale_nome: ordine.locale_nome,
          settimana_key: ordine.settimana_key,
        })
      }
    })

    const prodottiInevasi: Record<string, any> = {}
    ordiniStorici.forEach((ordine) => {
      const ordinata = Number(ordine.quantita || 0)
      const consegnata = Number(ordine.quantita_consegnata || 0)
      const inevasa = Math.max(ordinata - consegnata, 0)
      if (inevasa <= 0) return

      const chiave = `${ordine.locale_nome}-${ordine.nome_prodotto}`
      if (!prodottiInevasi[chiave]) {
        prodottiInevasi[chiave] = {
          locale_nome: ordine.locale_nome,
          nome_prodotto: ordine.nome_prodotto,
          count: 0,
          totale_inevaso: 0,
        }
      }
      prodottiInevasi[chiave].count += 1
      prodottiInevasi[chiave].totale_inevaso += inevasa
    })

    Object.values(prodottiInevasi).forEach((item: any) => {
      if (item.count >= 3) {
        lista.push({
          id: `sempre-inevaso-${item.locale_nome}-${item.nome_prodotto}`,
          tipo: "inevaso",
          gruppo: "operativo",
          gravita: "alta",
          titolo: "Prodotto spesso inevaso",
          descrizione: `${item.locale_nome} · ${item.nome_prodotto}: inevaso ${item.count} volte, totale mancante ${item.totale_inevaso}.`,
          locale_nome: item.locale_nome,
          settimana_key: settimanaKey,
        })
      }
    })

    giacenze.forEach((g) => {
      const quantita = Number(g.quantita || 0)
      if (quantita <= 0) {
        lista.push({
          id: `sotto-soglia-${g.id}`,
          tipo: "soglia",
          gruppo: "magazzino",
          gravita: "alta",
          titolo: "Prodotto a zero",
          descrizione: `${g.locale_nome || "Locale"} · ${
            g.nome_prodotto
          }: giacenza ${quantita}.`,
          locale_nome: g.locale_nome || "",
          settimana_key: settimanaKey,
        })
      }
    })

    products.forEach((prodotto) => {
      if (prodotto.active === false) return
      const codice = normalizzaCodice(prodotto.supplier_code || "")
      const prezzo = numero(prodotto.price)

      if (!codice) {
        lista.push({
          id: `prodotto-senza-codice-${prodotto.id}`,
          tipo: "prodotto_senza_codice",
          gruppo: "anagrafica",
          gravita: "alta",
          titolo: "Prodotto senza codice",
          descrizione: `${prodotto.name || "Prodotto"} non ha supplier_code.`,
          settimana_key: settimanaKey,
        })
      }

      if (prezzo <= 0) {
        lista.push({
          id: `prodotto-senza-prezzo-${prodotto.id}`,
          tipo: "prodotto_senza_prezzo",
          gruppo: "anagrafica",
          gravita: "media",
          titolo: "Prodotto senza prezzo",
          descrizione: `${prodotto.name || "Prodotto"} ha prezzo nullo o mancante.`,
          settimana_key: settimanaKey,
        })
      }
    })

    invoiceRows.forEach((riga) => {
      const invoice = invoicesById.get(String(riga.invoice_import_id))
      const numeroFattura = invoice?.invoice_number || "senza numero"
      const locale = invoice?.restaurant_name || "Locale"
      const codice = normalizzaCodice(riga.supplier_code || "")
      const prodottoAnagrafica = codice ? prodottiByCode.get(codice) : null

      if (riga.anomaly) {
        lista.push({
          id: `fattura-anomalia-${riga.id}`,
          tipo: "fattura_anomalia",
          gruppo: "fatture",
          gravita: "alta",
          titolo: "Anomalia fattura",
          descrizione: `Fattura ${numeroFattura} · ${locale} · ${
            riga.product_name || "Prodotto"
          }: ${riga.anomaly_note || "anomalia da controllare"}.`,
          locale_nome: locale,
          link: "/admin-storico-fatture",
        })
      }

      if (!riga.matched) {
        lista.push({
          id: `fattura-no-match-${riga.id}`,
          tipo: "fattura_no_match",
          gruppo: "fatture",
          gravita: "alta",
          titolo: "Riga fattura non abbinata",
          descrizione: `Fattura ${numeroFattura} · ${locale} · ${
            riga.supplier_code || "-"
          } ${riga.product_name || "Prodotto"} non è collegata a un ordine.`,
          locale_nome: locale,
          link: "/admin-storico-fatture",
        })
      }

      if (codice && !prodottoAnagrafica) {
        lista.push({
          id: `fattura-codice-non-anagrafica-${riga.id}`,
          tipo: "fattura_codice_sconosciuto",
          gruppo: "fatture",
          gravita: "media",
          titolo: "Codice fattura non in anagrafica",
          descrizione: `Fattura ${numeroFattura} · codice ${riga.supplier_code} non trovato in products.`,
          locale_nome: locale,
          link: "/admin-storico-fatture",
        })
      }

      if (riga.matched_order_id) {
        const ordine = ordiniById.get(String(riga.matched_order_id))
        const qtaFattura = numero(riga.quantity)
        const qtaOrdine = numero(ordine?.quantita)

        if (ordine && qtaOrdine > 0 && qtaFattura !== qtaOrdine) {
          lista.push({
            id: `fattura-qta-diversa-${riga.id}`,
            tipo: "fattura_qta_diversa",
            gruppo: "fatture",
            gravita: "media",
            titolo: "Quantità fattura diversa dall'ordine",
            descrizione: `Fattura ${numeroFattura} · ${riga.product_name}: fattura ${qtaFattura}, ordine ${qtaOrdine}.`,
            locale_nome: locale,
            link: "/admin-storico-fatture",
          })
        }
      }
    })

    return lista
  }, [
    locali,
    giacenze,
    ordini,
    ordiniStorici,
    products,
    invoiceRows,
    invoicesById,
    prodottiByCode,
    ordiniById,
  ])

  const alertFiltrati = useMemo(() => {
    let lista = [...alertCorrenti]

    if (filtroGruppo !== "tutti") lista = lista.filter((a) => a.gruppo === filtroGruppo)
    if (filtroTipo !== "tutti") lista = lista.filter((a) => a.tipo === filtroTipo)

    if (ricerca.trim()) {
      const q = ricerca.toLowerCase()
      lista = lista.filter((a) =>
        [a.titolo, a.descrizione, a.locale_nome, a.email, a.settimana_key, a.tipo, a.gruppo]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    }

    const pesoGravita: Record<string, number> = { alta: 0, media: 1, bassa: 2 }
    return lista.sort((a, b) => pesoGravita[a.gravita] - pesoGravita[b.gravita])
  }, [alertCorrenti, filtroTipo, filtroGruppo, ricerca])

  const logFiltrati = useMemo(() => {
    if (!ricerca.trim()) return alertLog.slice(0, 20)
    const q = ricerca.toLowerCase()
    return alertLog
      .filter((a) =>
        [a.locale_nome, a.email, a.tipo_alert, a.settimana_key, a.errore]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 20)
  }, [alertLog, ricerca])

  const conteggi = useMemo(() => {
    return {
      totali: alertCorrenti.length,
      alta: alertCorrenti.filter((a) => a.gravita === "alta").length,
      operativo: alertCorrenti.filter((a) => a.gruppo === "operativo").length,
      fatture: alertCorrenti.filter((a) => a.gruppo === "fatture").length,
      anagrafica: alertCorrenti.filter((a) => a.gruppo === "anagrafica").length,
      magazzino: alertCorrenti.filter((a) => a.gruppo === "magazzino").length,
      consumi: alertCorrenti.filter((a) => a.gruppo === "consumi").length,
    }
  }, [alertCorrenti])

  function classeGravita(gravita: string) {
    if (gravita === "alta") return "bg-red-100 text-red-700 border-red-200"
    if (gravita === "media") return "bg-amber-100 text-amber-700 border-amber-200"
    return "bg-slate-100 text-slate-700 border-slate-200"
  }

  function classeGruppo(gruppo: string) {
    if (gruppo === "fatture") return "bg-blue-50 text-blue-700 border-blue-200"
    if (gruppo === "anagrafica") return "bg-purple-50 text-purple-700 border-purple-200"
    if (gruppo === "magazzino") return "bg-emerald-50 text-emerald-700 border-emerald-200"
    if (gruppo === "consumi") return "bg-orange-50 text-orange-700 border-orange-200"
    return "bg-slate-50 text-slate-700 border-slate-200"
  }

  function iconaTipo(tipo: string) {
    if (tipo === "giacenza") return <Package className="h-5 w-5" />
    if (tipo === "ordine") return <ShoppingCart className="h-5 w-5" />
    if (tipo === "consegna") return <Truck className="h-5 w-5" />
    if (tipo === "anomalia") return <TrendingUp className="h-5 w-5" />
    if (tipo === "inattivo") return <Store className="h-5 w-5" />
    if (tipo === "inevaso") return <Ban className="h-5 w-5" />
    if (tipo.includes("fattura")) return <FileText className="h-5 w-5" />
    if (tipo.includes("codice") || tipo.includes("prezzo")) return <Tag className="h-5 w-5" />
    return <Bell className="h-5 w-5" />
  }

  function vai(link: string) {
    window.location.href = link
  }

  async function eseguiControlloEmail() {
    const conferma = window.confirm(
      "Vuoi eseguire ora il controllo email per ordini/giacenze mancanti?"
    )
    if (!conferma) return

    const res = await fetch("/api/check-missing-orders")
    const json = await res.json()
    console.log("RISULTATO ALERT EMAIL:", json)
    alert("Controllo completato.")
    caricaDati()
  }

  function KpiCard({
    titolo,
    valore,
    descrizione,
    icon: Icon,
    colore,
  }: {
    titolo: string
    valore: number | string
    descrizione: string
    icon: any
    colore: string
  }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{titolo}</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">{valore}</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">{descrizione}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colore}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight">Centro anomalie live</h1>
              <p className="mt-0.5 text-xs font-bold text-slate-300">
                Admin · Ordini, consegne, fatture, anagrafica e magazzino
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                onClick={() => vai("/admin-dashboard")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white"
              >
                <Home className="h-4 w-4" />
                Home Admin
              </button>
              <button onClick={logout} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-black text-white">
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard titolo="Alert attivi" valore={conteggi.totali} descrizione="Totale anomalie live" icon={Bell} colore="bg-slate-100 text-slate-700" />
          <KpiCard titolo="Critici" valore={conteggi.alta} descrizione="Gravità alta" icon={AlertTriangle} colore="bg-red-100 text-red-700" />
          <KpiCard titolo="Operativo" valore={conteggi.operativo} descrizione="Ordini e consegne" icon={Truck} colore="bg-amber-100 text-amber-700" />
          <KpiCard titolo="Fatture" valore={conteggi.fatture} descrizione="Match e quantità" icon={FileText} colore="bg-blue-100 text-blue-700" />
          <KpiCard titolo="Anagrafica" valore={conteggi.anagrafica} descrizione="Codici e prezzi" icon={Tag} colore="bg-purple-100 text-purple-700" />
          <KpiCard titolo="Magazzino" valore={conteggi.magazzino + conteggi.consumi} descrizione="Soglie e consumi" icon={Package} colore="bg-emerald-100 text-emerald-700" />
        </section>

        <section className="grid gap-3 xl:grid-cols-[1fr_180px_180px_200px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca alert, locale, fattura, prodotto, codice..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="h-12 w-full rounded-xl border-2 border-slate-300 bg-white pl-10 pr-3 text-sm font-bold text-slate-950 placeholder:text-slate-500"
            />
          </div>

          <select
            value={filtroGruppo}
            onChange={(e) => setFiltroGruppo(e.target.value)}
            className="h-12 rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-bold text-slate-950"
          >
            <option value="tutti">Tutti i gruppi</option>
            <option value="operativo">Operativo</option>
            <option value="fatture">Fatture</option>
            <option value="anagrafica">Anagrafica</option>
            <option value="magazzino">Magazzino</option>
            <option value="consumi">Consumi</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="h-12 rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-bold text-slate-950"
          >
            <option value="tutti">Tutti i tipi</option>
            <option value="giacenza">Giacenze</option>
            <option value="ordine">Ordini</option>
            <option value="consegna">Consegne</option>
            <option value="fattura_anomalia">Fattura anomalia</option>
            <option value="fattura_no_match">Fattura no match</option>
            <option value="fattura_qta_diversa">Quantità diversa</option>
            <option value="prodotto_senza_codice">Prodotto senza codice</option>
            <option value="prodotto_senza_prezzo">Prodotto senza prezzo</option>
            <option value="anomalia">Consumi anomali</option>
            <option value="inevaso">Sempre inevasi</option>
            <option value="inattivo">Locali inattivi</option>
            <option value="soglia">Sotto soglia</option>
          </select>

          <button onClick={() => vai("/admin-storico-fatture")} className="h-12 rounded-xl bg-blue-600 px-4 text-sm font-black text-white">
            Storico fatture
          </button>

          <button onClick={eseguiControlloEmail} className="h-12 rounded-xl bg-red-600 px-4 text-sm font-black text-white">
            Controllo email
          </button>
        </section>

        {errore && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">{errore}</section>
        )}

        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            Caricamento alert...
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h2 className="text-lg font-black text-slate-950">Alert attivi</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  {alertFiltrati.length} filtrati
                </span>
              </div>

              <div className="space-y-3">
                {alertFiltrati.map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="mt-1 shrink-0 text-slate-700">{iconaTipo(alert.tipo)}</div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-black text-slate-950">{alert.titolo}</h3>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${classeGruppo(alert.gruppo)}`}>
                              {alert.gruppo}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{alert.descrizione}</p>
                          <p className="mt-1 text-[11px] font-bold text-slate-500">
                            {alert.email || "Nessuna email"} · {alert.settimana_key || "senza settimana"}
                          </p>
                          {alert.link && (
                            <button onClick={() => vai(alert.link || "/admin-dashboard")} className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white">
                              Apri dettaglio
                            </button>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${classeGravita(alert.gravita)}`}>
                        {alert.gravita}
                      </span>
                    </div>
                  </div>
                ))}

                {alertFiltrati.length === 0 && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
                    Nessun alert attivo con i filtri selezionati.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h2 className="text-lg font-black text-slate-950">Stato controlli</h2>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold"><span>Fatture lette</span><span>{invoiceImports.length}</span></div>
                  <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold"><span>Righe fattura analizzate</span><span>{invoiceRows.length}</span></div>
                  <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold"><span>Prodotti anagrafica</span><span>{products.length}</span></div>
                  <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold"><span>Ordini storici</span><span>{ordiniStorici.length}</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-black text-slate-950">Log email alert</h2>
                </div>

                <div className="space-y-3">
                  {logFiltrati.map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-950">{log.locale_nome}</h3>
                          <p className="mt-1 text-xs font-bold text-slate-600">{log.email} · {log.tipo_alert}</p>
                          <p className="mt-1 text-[11px] font-bold text-slate-500">Settimana: {log.settimana_key}</p>
                          {log.errore && <p className="mt-1 text-xs font-bold text-red-600">{log.errore}</p>}
                        </div>
                        {log.inviato ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                      </div>
                    </div>
                  ))}

                  {logFiltrati.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                      Nessun log email trovato.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <button onClick={caricaDati} disabled={loading} className="fixed bottom-4 right-4 inline-flex h-12 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-xl disabled:bg-slate-400">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </button>
      </div>
    </main>
  )
}