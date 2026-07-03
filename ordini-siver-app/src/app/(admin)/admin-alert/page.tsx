"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Ban,
  Bell,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
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

type SezioneAlert = {
  key: string
  titolo: string
  descrizione: string
  gruppo?: AlertItem["gruppo"]
  tipi?: string[]
  colore: string
  icon: any
}

const sezioni: SezioneAlert[] = [
  {
    key: "critici",
    titolo: "Critici",
    descrizione: "Alert ad alta priorità da controllare subito.",
    colore: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
  {
    key: "operativo",
    titolo: "Operativo",
    descrizione: "Giacenze, ordini, consegne e locali inattivi.",
    gruppo: "operativo",
    colore: "bg-amber-100 text-amber-700",
    icon: Truck,
  },
  {
    key: "fatture",
    titolo: "Fatture",
    descrizione: "Anomalie, righe non abbinate e quantità diverse.",
    gruppo: "fatture",
    colore: "bg-blue-100 text-blue-700",
    icon: FileText,
  },
  {
    key: "anagrafica",
    titolo: "Anagrafica",
    descrizione: "Prodotti senza codice, senza prezzo o codici sconosciuti.",
    gruppo: "anagrafica",
    colore: "bg-purple-100 text-purple-700",
    icon: Tag,
  },
  {
    key: "magazzino",
    titolo: "Magazzino e consumi",
    descrizione: "Soglie, prodotti a zero e consumi anomali.",
    tipi: ["soglia", "anomalia", "inevaso"],
    colore: "bg-emerald-100 text-emerald-700",
    icon: Package,
  },
]

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
  const [sezioneAperta, setSezioneAperta] = useState("critici")
  const [errore, setErrore] = useState("")

  useEffect(() => {
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
    if (!ricerca.trim()) return alertCorrenti

    const q = ricerca.toLowerCase()

    return alertCorrenti.filter((a) =>
      [
        a.titolo,
        a.descrizione,
        a.locale_nome,
        a.email,
        a.settimana_key,
        a.tipo,
        a.gruppo,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [alertCorrenti, ricerca])

  const alertPerSezione = useMemo(() => {
    const map = new Map<string, AlertItem[]>()

    sezioni.forEach((sezione) => {
      let items = [...alertFiltrati]

      if (sezione.key === "critici") {
        items = items.filter((a) => a.gravita === "alta")
      } else if (sezione.gruppo) {
        items = items.filter((a) => a.gruppo === sezione.gruppo)
      } else if (sezione.tipi) {
        items = items.filter((a) => sezione.tipi?.includes(a.tipo))
      }

      const pesoGravita: Record<string, number> = { alta: 0, media: 1, bassa: 2 }

      items.sort((a, b) => pesoGravita[a.gravita] - pesoGravita[b.gravita])
      map.set(sezione.key, items)
    })

    return map
  }, [alertFiltrati])

  const logFiltrati = useMemo(() => {
    if (!ricerca.trim()) return alertLog.slice(0, 10)

    const q = ricerca.toLowerCase()

    return alertLog
      .filter((a) =>
        [a.locale_nome, a.email, a.tipo_alert, a.settimana_key, a.errore]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 10)
  }, [alertLog, ricerca])

  const conteggi = useMemo(() => {
    return {
      totali: alertCorrenti.length,
      alta: alertCorrenti.filter((a) => a.gravita === "alta").length,
      operativo: alertCorrenti.filter((a) => a.gruppo === "operativo").length,
      fatture: alertCorrenti.filter((a) => a.gruppo === "fatture").length,
      anagrafica: alertCorrenti.filter((a) => a.gruppo === "anagrafica").length,
      magazzino:
        alertCorrenti.filter((a) => a.gruppo === "magazzino").length +
        alertCorrenti.filter((a) => a.gruppo === "consumi").length,
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

   const { data } = await supabase.auth.getSession()
const token = data.session?.access_token

const res = await fetch("/api/check-missing-orders", {
  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
})

const json = await res.json()

if (!res.ok) {
  throw new Error(json.error || "Errore controllo alert")
}

console.log("RISULTATO ALERT EMAIL:", json)
alert("Controllo completato.")
caricaDati()
  }
  function CardConteggio({
    titolo,
    valore,
    descrizione,
    icon: Icon,
    colore,
    active,
    onClick,
  }: {
    titolo: string
    valore: number | string
    descrizione: string
    icon: any
    colore: string
    active?: boolean
    onClick?: () => void
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-3xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
          active ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{titolo}</p>
            <h2 className="mt-2 text-4xl font-black text-slate-950">{valore}</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">{descrizione}</p>
          </div>
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${colore}`}>
            <Icon className="h-7 w-7" />
          </div>
        </div>
      </button>
    )
  }

  function AlertRow({ alert }: { alert: AlertItem }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="mt-1 shrink-0 text-slate-700">{iconaTipo(alert.tipo)}</div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-slate-950">{alert.titolo}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${classeGruppo(alert.gruppo)}`}>
                  {alert.gruppo}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${classeGravita(alert.gravita)}`}>
                  {alert.gravita}
                </span>
              </div>

              <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                {alert.descrizione}
              </p>

              <p className="mt-1 text-[11px] font-bold text-slate-500">
                {alert.locale_nome || "Senza locale"} · {alert.email || "Nessuna email"} · {alert.settimana_key || "senza settimana"}
              </p>

              {alert.link && (
                <button
                  onClick={() => vai(alert.link || "/admin-dashboard")}
                  className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
                >
                  Apri dettaglio
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-300">
              Sistema
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Centro alert
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-bold text-slate-300 sm:text-base">
              Controlli operativi, fatture, anagrafica, magazzino e consumi.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={caricaDati}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:bg-slate-500"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>

            <button
              onClick={eseguiControlloEmail}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-black text-white"
            >
              Controllo email
            </button>
          </div>
        </div>
      </section>

      {errore && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
          {errore}
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CardConteggio
          titolo="Totali"
          valore={conteggi.totali}
          descrizione="Alert attivi"
          icon={Bell}
          colore="bg-slate-100 text-slate-700"
          active={sezioneAperta === "tutti"}
          onClick={() => setSezioneAperta("tutti")}
        />
        <CardConteggio
          titolo="Critici"
          valore={conteggi.alta}
          descrizione="Priorità alta"
          icon={AlertTriangle}
          colore="bg-red-100 text-red-700"
          active={sezioneAperta === "critici"}
          onClick={() => setSezioneAperta("critici")}
        />
        <CardConteggio
          titolo="Operativo"
          valore={conteggi.operativo}
          descrizione="Ordini e consegne"
          icon={Truck}
          colore="bg-amber-100 text-amber-700"
          active={sezioneAperta === "operativo"}
          onClick={() => setSezioneAperta("operativo")}
        />
        <CardConteggio
          titolo="Fatture"
          valore={conteggi.fatture}
          descrizione="Controlli fatture"
          icon={FileText}
          colore="bg-blue-100 text-blue-700"
          active={sezioneAperta === "fatture"}
          onClick={() => setSezioneAperta("fatture")}
        />
        <CardConteggio
          titolo="Anagrafica"
          valore={conteggi.anagrafica}
          descrizione="Codici e prezzi"
          icon={Tag}
          colore="bg-purple-100 text-purple-700"
          active={sezioneAperta === "anagrafica"}
          onClick={() => setSezioneAperta("anagrafica")}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca alert, locale, fattura, prodotto, codice..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
            />
          </div>

          <button
            onClick={() => vai("/admin-storico-fatture")}
            className="h-14 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
          >
            Storico fatture
          </button>

          <button
            onClick={() => setRicerca("")}
            className="h-14 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white"
          >
            Pulisci ricerca
          </button>
        </div>
      </section>

      {loading ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-black text-slate-500">
          Caricamento alert...
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {sezioneAperta === "tutti" ? (
              sezioni.map((sezione) => {
                const Icon = sezione.icon
                const items = alertPerSezione.get(sezione.key) || []
                const aperta = false

                return (
                  <button
                    key={sezione.key}
                    onClick={() => setSezioneAperta(sezione.key)}
                    className="flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${sezione.colore}`}>
                        <Icon className="h-7 w-7" />
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-2xl font-black text-slate-950">
                          {sezione.titolo}
                        </h2>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {sezione.descrizione}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-4xl font-black text-slate-950">
                          {items.length}
                        </p>
                        <p className="text-xs font-black uppercase text-slate-500">
                          alert
                        </p>
                      </div>
                      {aperta ? (
                        <ChevronDown className="h-6 w-6 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                  </button>
                )
              })
            ) : (
              <>
                <button
                  onClick={() => setSezioneAperta("tutti")}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
                >
                  ← Torna alle sezioni
                </button>

                {(() => {
                  const sezione =
                    sezioni.find((s) => s.key === sezioneAperta) ||
                    sezioni[0]
                  const Icon = sezione.icon
                  const items =
                    sezioneAperta === "tutti"
                      ? alertFiltrati
                      : alertPerSezione.get(sezione.key) || []

                  return (
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${sezione.colore}`}>
                            <Icon className="h-7 w-7" />
                          </div>
                          <div>
                            <h2 className="text-3xl font-black text-slate-950">
                              {sezione.titolo}
                            </h2>
                            <p className="text-sm font-bold text-slate-500">
                              {sezione.descrizione}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                          {items.length} alert
                        </span>
                      </div>

                      <div className="space-y-3">
                        {items.map((alert) => (
                          <AlertRow key={alert.id} alert={alert} />
                        ))}

                        {items.length === 0 && (
                          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm font-black text-green-700">
                            Nessun alert in questa sezione.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-black text-slate-950">
                  Stato controlli
                </h2>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold">
                  <span>Fatture lette</span>
                  <span>{invoiceImports.length}</span>
                </div>
                <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold">
                  <span>Righe fattura</span>
                  <span>{invoiceRows.length}</span>
                </div>
                <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold">
                  <span>Prodotti</span>
                  <span>{products.length}</span>
                </div>
                <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold">
                  <span>Ordini storici</span>
                  <span>{ordiniStorici.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-black text-slate-950">
                  Log email alert
                </h2>
              </div>

              <div className="space-y-3">
                {logFiltrati.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-950">
                          {log.locale_nome}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-600">
                          {log.email} · {log.tipo_alert}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-slate-500">
                          Settimana: {log.settimana_key}
                        </p>
                        {log.errore && (
                          <p className="mt-1 text-xs font-bold text-red-600">
                            {log.errore}
                          </p>
                        )}
                      </div>
                      {log.inviato ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
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
          </aside>
        </section>
      )}
    </main>
  )
}