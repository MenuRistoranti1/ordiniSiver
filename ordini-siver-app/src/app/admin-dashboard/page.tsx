"use client"

import { useEffect, useMemo, useState } from "react"
import JSZip from "jszip"
import {
  Home,
  ShoppingCart,
  Package,
  Boxes,
  BarChart3,
  Euro,
  MessageCircle,
  Truck,
  History,
  Trash2,
  Upload,
  AlertTriangle,
  Menu,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  Database,
  FileText,
  Bell,
  Download,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AdminDashboard() {
  const [locali, setLocali] = useState<any[]>([])
  const [ordini, setOrdini] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [giacenzeFatte, setGiacenzeFatte] = useState<any[]>([])
  const [ordiniFatti, setOrdiniFatti] = useState<any[]>([])

  const [localeId, setLocaleId] = useState("")
  const [dal, setDal] = useState("")
  const [al, setAl] = useState("")

  const [fileXml, setFileXml] = useState<File | null>(null)
  const [loadingImport, setLoadingImport] = useState(false)
  const [risultatoImport, setRisultatoImport] = useState("")
  const [menuAperto, setMenuAperto] = useState(false)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [erroreDashboard, setErroreDashboard] = useState("")
  const [ricerca, setRicerca] = useState("")
  const [ricercaProdottiExport, setRicercaProdottiExport] = useState("")
  const [filtroStatoProdotti, setFiltroStatoProdotti] = useState<
    "tutti" | "attivi" | "inattivi" | "senza_codice" | "senza_prezzo"
  >("tutti")
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [creazioneNotifiche, setCreazioneNotifiche] = useState(false)
  const [showAnomalie, setShowAnomalie] = useState(false)

  useEffect(() => {
    if (!showAnomalie) return

    const overflowPrecedente = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function chiudiConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowAnomalie(false)
    }

    window.addEventListener("keydown", chiudiConEscape)

    return () => {
      document.body.style.overflow = overflowPrecedente
      window.removeEventListener("keydown", chiudiConEscape)
    }
  }, [showAnomalie])

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

    const oggi = new Date()
    const primo = new Date(oggi.getFullYear(), oggi.getMonth(), 1)

    setDal(primo.toISOString().split("T")[0])
    setAl(oggi.toISOString().split("T")[0])

    caricaDashboard()
    caricaNotifiche()

    const channel = supabase
      .channel("admin-dashboard-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          caricaNotifiche()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ordini",
        },
        () => {
          caricaDashboard()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "giacenze_settimana",
        },
        () => {
          caricaDashboard()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          caricaDashboard()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (locali.length === 0 && ordini.length === 0 && products.length === 0) return
    generaNotificheAdmin()
  }, [locali, ordini, products])

  async function caricaDashboard() {
    setLoadingDashboard(true)
    setErroreDashboard("")

    try {
      const [restaurantsRes, ordiniRes, productsRes, giacenzeRes] = await Promise.all([
        supabase.from("restaurants").select("*").order("name"),
        supabase.from("ordini").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("id, name, supplier_code, category, unit, active, price").order("name"),
        supabase.from("giacenze_settimana").select("*"),
      ])

      if (restaurantsRes.error) throw restaurantsRes.error
      if (ordiniRes.error) throw ordiniRes.error
      if (productsRes.error) throw productsRes.error
      if (giacenzeRes.error) throw giacenzeRes.error

      const restaurants = restaurantsRes.data || []
      const ordiniData = ordiniRes.data || []
      const productsData = productsRes.data || []
      const giacenzeData = giacenzeRes.data || []

      const idsOrdini = new Set(ordiniData.map((o: any) => String(o.locale_id || "")))
      const idsGiacenze = new Set(giacenzeData.map((g: any) => String(g.locale_id || "")))

      setLocali(restaurants)
      setOrdini(ordiniData)
      setProducts(productsData)
      setOrdiniFatti(restaurants.filter((l: any) => idsOrdini.has(String(l.id))))
      setGiacenzeFatte(restaurants.filter((l: any) => idsGiacenze.has(String(l.id))))
    } catch (error) {
      console.log(error)
      setErroreDashboard("Errore caricamento dashboard. Riprova.")
    }

    setLoadingDashboard(false)
  }

  async function caricaNotifiche() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.log("Errore caricamento notifiche", error)
      return
    }

    setNotifications(data || [])
  }

  async function creaNotificaSeNonEsiste({
    type,
    title,
    message,
    severity = "info",
    locale_id = null,
    locale_nome = null,
    source = "admin-dashboard",
    source_id,
  }: {
    type: string
    title: string
    message: string
    severity?: string
    locale_id?: string | null
    locale_nome?: string | null
    source?: string
    source_id: string
  }) {
    const { data: esistente } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", type)
      .eq("source", source)
      .eq("source_id", source_id)
      .eq("read", false)
      .maybeSingle()

    if (esistente?.id) return

    const { error } = await supabase.from("notifications").insert({
      type,
      title,
      message,
      severity,
      locale_id,
      locale_nome,
      read: false,
      source,
      source_id,
    })

    if (error) {
      console.log("Errore creazione notifica", error)
    }
  }

  async function generaNotificheAdmin() {
    if (creazioneNotifiche) return

    setCreazioneNotifiche(true)

    try {
      const notificheDaCreare: Array<{
        type: string
        title: string
        message: string
        severity?: string
        locale_id?: string | null
        locale_nome?: string | null
        source?: string
        source_id: string
      }> = []

      const prodottiSenzaCodiceLista = products.filter(
        (p) => p.active !== false && !normalizzaCodice(p.supplier_code || "")
      )

      const prodottiSenzaPrezzoLista = products.filter(
        (p) => p.active !== false && prezzoNumero(p.price) <= 0
      )

      prodottiSenzaCodiceLista.slice(0, 20).forEach((prodotto) => {
        notificheDaCreare.push({
          type: "product_missing_code",
          title: "Prodotto senza codice",
          message: `${prodotto.name || "Prodotto"} non ha supplier_code in anagrafica.`,
          severity: "warning",
          source: "products",
          source_id: String(prodotto.id || prodotto.name),
        })
      })

      prodottiSenzaPrezzoLista.slice(0, 20).forEach((prodotto) => {
        notificheDaCreare.push({
          type: "product_missing_price",
          title: "Prodotto senza prezzo",
          message: `${prodotto.name || "Prodotto"} ha prezzo nullo o mancante.`,
          severity: "warning",
          source: "products",
          source_id: String(prodotto.id || prodotto.name),
        })
      })

      ordini
        .filter((ordine) => ordine.stato_consegna === "parziale")
        .slice(0, 30)
        .forEach((ordine) => {
          notificheDaCreare.push({
            type: "partial_delivery",
            title: "Consegna parziale",
            message: `${ordine.locale_nome || "Locale"} · ${ordine.nome_prodotto || "Prodotto"}: consegnati ${ordine.quantita_consegnata || 0} su ${ordine.quantita || 0}.`,
            severity: "warning",
            locale_id: ordine.locale_id || null,
            locale_nome: ordine.locale_nome || null,
            source: "ordini",
            source_id: String(ordine.id),
          })
        })

      const { data: righeFattura, error: righeError } = await supabase
        .from("invoice_import_rows")
        .select("id, supplier_code, product_name, anomaly, anomaly_note, matched, invoice_import_id")
        .or("anomaly.eq.true,matched.eq.false")
        .order("created_at", { ascending: false })
        .limit(50)

      if (!righeError) {
        ;(righeFattura || []).forEach((riga: any) => {
          notificheDaCreare.push({
            type: riga.matched === false ? "invoice_row_unmatched" : "invoice_row_anomaly",
            title: riga.matched === false ? "Riga fattura non abbinata" : "Anomalia fattura",
            message: `${riga.supplier_code || "-"} · ${riga.product_name || "Prodotto"}${riga.anomaly_note ? ` · ${riga.anomaly_note}` : ""}`,
            severity: "danger",
            source: "invoice_import_rows",
            source_id: String(riga.id),
          })
        })
      }

      const { data: prezzi, error: prezziError } = await supabase
        .from("product_price_history")
        .select("id, supplier_code, product_name, old_price, new_price, variation_percent, invoice_number")
        .gt("variation_percent", 10)
        .order("created_at", { ascending: false })
        .limit(50)

      if (!prezziError) {
        ;(prezzi || []).forEach((prezzo: any) => {
          notificheDaCreare.push({
            type: "price_increase",
            title: "Aumento prezzo prodotto",
            message: `${prezzo.product_name || prezzo.supplier_code || "Prodotto"}: da ${euro(Number(prezzo.old_price || 0))} a ${euro(Number(prezzo.new_price || 0))} (+${Number(prezzo.variation_percent || 0).toFixed(1)}%)${prezzo.invoice_number ? ` · Fattura ${prezzo.invoice_number}` : ""}`,
            severity: "danger",
            source: "product_price_history",
            source_id: String(prezzo.id),
          })
        })
      }

      for (const notifica of notificheDaCreare) {
        await creaNotificaSeNonEsiste(notifica)
      }

      await caricaNotifiche()
    } catch (error) {
      console.log("Errore generazione notifiche admin", error)
    }

    setCreazioneNotifiche(false)
  }

  async function segnaLetta(id: string) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)

    caricaNotifiche()
  }

  async function segnaTutteLette() {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false)

    caricaNotifiche()
  }

  function coloreNotifica(severity: string) {
    if (severity === "danger") return "border-red-200 bg-red-50"
    if (severity === "warning") return "border-amber-200 bg-amber-50"
    if (severity === "success") return "border-green-200 bg-green-50"
    return "border-blue-200 bg-blue-50"
  }

  function testoData(data?: string) {
    if (!data) return ""
    const d = new Date(data)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleString("it-IT")
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

  function vai(percorso: string) {
    window.location.href = percorso
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
      .toLowerCase()
      .replace(/\s+/g, "")
  }

  function prezzoNumero(prezzo: any) {
    const numero = Number(String(prezzo || "0").replace(",", "."))
    return Number.isFinite(numero) ? numero : 0
  }

  function euro(valore: number) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(valore || 0)
  }

  function prodottoDaOrdine(ordine: any) {
    const codiceOrdine = normalizzaCodice(ordine.supplier_code || "")

    if (codiceOrdine) {
      const byCode = products.find(
        (p) => normalizzaCodice(p.supplier_code || "") === codiceOrdine
      )

      if (byCode) return byCode
    }

    const nomeOrdine = normalizza(ordine.nome_prodotto || "")

    return products.find((p) => normalizza(p.name || "") === nomeOrdine) || null
  }

  function richiediLocale(percorso: string) {
    if (!localeId) {
      alert("Seleziona prima un locale")
      return
    }

    const locale = locali.find((l) => l.id === localeId)
    const nome = encodeURIComponent(locale?.name || "")
    window.location.href = `${percorso}?locale_id=${localeId}&locale_nome=${nome}`
  }

  function mostraLocaliMancantiOrdini() {
    const mancanti = locali.filter(
      (locale) => !ordiniFatti.some((ordine) => ordine.id === locale.id)
    )

    if (mancanti.length === 0) {
      alert("Tutti i locali hanno inviato gli ordini.")
      return
    }

    alert("Locali mancanti ordine:\n\n" + mancanti.map((l) => `• ${l.name}`).join("\n"))
  }

  function mostraLocaliMancantiGiacenze() {
    const mancanti = locali.filter(
      (locale) => !giacenzeFatte.some((giacenza) => giacenza.id === locale.id)
    )

    if (mancanti.length === 0) {
      alert("Tutti i locali hanno inviato le giacenze.")
      return
    }

    alert("Locali mancanti giacenze:\n\n" + mancanti.map((l) => `• ${l.name}`).join("\n"))
  }

  const ordiniFiltrati = useMemo(() => {
    return ordini.filter((o) => {
      const dataOrdine = o.settimana_key || o.created_at?.split("T")[0] || ""
      const testo = normalizza([
        o.nome_prodotto,
        o.supplier_code,
        o.locale_nome,
        o.responsabile,
        o.stato_consegna,
      ].filter(Boolean).join(" "))

      if (dal && dataOrdine && dataOrdine < dal) return false
      if (al && dataOrdine && dataOrdine > al) return false
      if (localeId && String(o.locale_id) !== String(localeId)) return false
      if (ricerca && !testo.includes(normalizza(ricerca))) return false

      return true
    })
  }, [ordini, dal, al, localeId, ricerca])

  const totaleQuantita = ordiniFiltrati.reduce(
    (acc, o) => acc + Number(o.quantita || 0),
    0
  )

  const totaleProdotti = ordiniFiltrati.length

  const valoreStimato = ordiniFiltrati.reduce((acc, ordine) => {
    const prodotto = prodottoDaOrdine(ordine)
    return acc + Number(ordine.quantita || 0) * prezzoNumero(prodotto?.price)
  }, 0)

  const ordiniSenzaCodice = ordiniFiltrati.filter(
    (ordine) => !normalizzaCodice(ordine.supplier_code || "")
  )

  const ordiniSenzaPrezzo = ordiniFiltrati.filter((ordine) => {
    const prodotto = prodottoDaOrdine(ordine)
    return !prodotto || prezzoNumero(prodotto.price) <= 0
  })

  const consegneParziali = ordiniFiltrati.filter(
    (ordine) => ordine.stato_consegna === "parziale"
  )

  const consegneDaFare = ordiniFiltrati.filter(
    (ordine) => !ordine.stato_consegna || ordine.stato_consegna === "da_consegnare"
  )

  const prodottiSenzaCodice = products.filter(
    (p) => p.active !== false && !normalizzaCodice(p.supplier_code || "")
  )

  const prodottiSenzaPrezzo = products.filter(
    (p) => p.active !== false && prezzoNumero(p.price) <= 0
  )

  const prodottiAnagraficaFiltrati = useMemo(() => {
    const query = normalizza(ricercaProdottiExport)

    return products
      .filter((prodotto) => {
        const testoProdotto = normalizza(
          [
            prodotto.supplier_code,
            prodotto.name,
            prodotto.category,
            prodotto.unit,
          ]
            .filter(Boolean)
            .join(" ")
        )

        if (query && !testoProdotto.includes(query)) return false
        if (filtroStatoProdotti === "attivi" && prodotto.active === false) return false
        if (filtroStatoProdotti === "inattivi" && prodotto.active !== false) return false
        if (filtroStatoProdotti === "senza_codice" && normalizzaCodice(prodotto.supplier_code || "")) return false
        if (filtroStatoProdotti === "senza_prezzo" && prezzoNumero(prodotto.price) > 0) return false

        return true
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "it"))
  }, [products, ricercaProdottiExport, filtroStatoProdotti])

  async function scaricaAnagraficaProdottiExcel(esportaTutti: boolean) {
    const righe = (esportaTutti ? [...products] : [...prodottiAnagraficaFiltrati]).sort(
      (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "it")
    )

    if (righe.length === 0) {
      alert("Nessun prodotto da esportare.")
      return
    }

    const ExcelJS = await import("exceljs")
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Anagrafica prodotti")

    worksheet.columns = [
      { header: "Codice", key: "codice", width: 20 },
      { header: "Nome prodotto", key: "nome", width: 48 },
      { header: "Categoria", key: "categoria", width: 22 },
      { header: "Unità di misura", key: "unita", width: 18 },
      { header: "Prezzo", key: "prezzo", width: 16 },
      { header: "Stato", key: "stato", width: 14 },
    ]

    righe.forEach((prodotto) => {
      worksheet.addRow({
        codice: prodotto.supplier_code || "Senza codice",
        nome: prodotto.name || "Prodotto senza nome",
        categoria: prodotto.category || "",
        unita: prodotto.unit || "",
        prezzo: prezzoNumero(prodotto.price),
        stato: prodotto.active === false ? "Inattivo" : "Attivo",
      })
    })

    const rigaTotale = worksheet.addRow({
      codice: "",
      nome: "NUMERO PRODOTTI ESPORTATI",
      categoria: "",
      unita: "",
      prezzo: "",
      stato: righe.length,
    })

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    }
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" }
    worksheet.getRow(1).height = 24

    rigaTotale.font = { bold: true }
    rigaTotale.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    }

    worksheet.getColumn("prezzo").numFmt = '€ #,##0.00'
    worksheet.views = [{ state: "frozen", ySplit: 1 }]
    worksheet.autoFilter = { from: "A1", to: "F1" }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const dataOggi = new Date().toISOString().split("T")[0]

    link.href = url
    link.download = esportaTutti
      ? `anagrafica-prodotti-completa-${dataOggi}.xlsx`
      : `anagrafica-prodotti-filtrata-${dataOggi}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const anomalieTotali =
    ordiniSenzaCodice.length +
    ordiniSenzaPrezzo.length +
    prodottiSenzaCodice.length +
    prodottiSenzaPrezzo.length +
    consegneParziali.length

  const prodottiRaggruppati = Object.values(
    ordiniFiltrati.reduce((acc: any, ordine: any) => {
      const codice = normalizzaCodice(ordine.supplier_code || "")
      const chiave = codice || normalizza(ordine.nome_prodotto || "")

      if (!chiave) return acc

      if (!acc[chiave]) {
        acc[chiave] = {
          codice: ordine.supplier_code || "",
          nome: ordine.nome_prodotto || "Prodotto",
          quantita: 0,
          valore: 0,
        }
      }

      const prodotto = prodottoDaOrdine(ordine)
      const quantita = Number(ordine.quantita || 0)

      acc[chiave].quantita += quantita
      acc[chiave].valore += quantita * prezzoNumero(prodotto?.price)
      return acc
    }, {})
  )
    .sort((a: any, b: any) => b.quantita - a.quantita)
    .slice(0, 10)

  const ordiniPerLocale = Object.values(
    ordiniFiltrati.reduce((acc: any, ordine: any) => {
      const nomeLocale = ordine.locale_nome || "Locale"
      const prodotto = prodottoDaOrdine(ordine)
      const quantita = Number(ordine.quantita || 0)

      if (!acc[nomeLocale]) {
        acc[nomeLocale] = {
          nome: nomeLocale,
          totale: 0,
          valore: 0,
        }
      }

      acc[nomeLocale].totale += quantita
      acc[nomeLocale].valore += quantita * prezzoNumero(prodotto?.price)
      return acc
    }, {})
  ).sort((a: any, b: any) => b.totale - a.totale)

  const percentOrdini =
    locali.length > 0 ? Math.round((ordiniFatti.length / locali.length) * 100) : 0

  const percentGiacenze =
    locali.length > 0 ? Math.round((giacenzeFatte.length / locali.length) * 100) : 0

  async function importaProdotti() {
    if (!fileXml) {
      alert("Seleziona ZIP/XML")
      return
    }

    setLoadingImport(true)
    setRisultatoImport("")

    try {
      const prodotti = new Map<string, any>()
      let fileLetti = 0
      let righeScartate = 0

      if (fileXml.name.toLowerCase().endsWith(".zip")) {
        const zip = await JSZip.loadAsync(fileXml)

        for (const nomeFile of Object.keys(zip.files)) {
          if (!nomeFile.toLowerCase().endsWith(".xml")) continue
          const xmlText = await zip.files[nomeFile].async("text")
          const risultato = estraiProdotti(xmlText, prodotti)
          fileLetti++
          righeScartate += risultato.scartate
        }
      } else {
        const xmlText = await fileXml.text()
        const risultato = estraiProdotti(xmlText, prodotti)
        fileLetti = 1
        righeScartate += risultato.scartate
      }

      const prodottiDaSalvare = Array.from(prodotti.values())

      if (prodottiDaSalvare.length === 0) {
        setRisultatoImport(
          `Nessun prodotto valido trovato. Righe scartate: ${righeScartate}.`
        )
        setLoadingImport(false)
        return
      }

      const { error } = await supabase
        .from("products")
        .upsert(prodottiDaSalvare, { onConflict: "supplier_code" })

      if (error) throw error

      const messaggioImport = `Import completato. File letti: ${fileLetti}. Prodotti inseriti/aggiornati: ${prodottiDaSalvare.length}. Righe scartate: ${righeScartate}.`

      setRisultatoImport(messaggioImport)

      await creaNotificaSeNonEsiste({
        type: "import_products_completed",
        title: "Import prodotti completato",
        message: messaggioImport,
        severity: "success",
        source: "admin-dashboard",
        source_id: `import-${Date.now()}`,
      })

      await caricaDashboard()
      await caricaNotifiche()
    } catch (e: any) {
      console.log(e)
      alert(e?.message || "Errore import")
    }

    setLoadingImport(false)
  }

  function estraiProdotti(xmlText: string, prodotti: Map<string, any>) {
    const parser = new DOMParser()
    const xml = parser.parseFromString(xmlText, "text/xml")
    const righe = Array.from(xml.getElementsByTagName("DettaglioLinee"))
    let scartate = 0

    righe.forEach((riga: any) => {
      const nome =
        riga.getElementsByTagName("Descrizione")[0]?.textContent?.trim() || ""

      const prezzo =
        riga.getElementsByTagName("PrezzoUnitario")[0]?.textContent?.trim() || "0"

      const unit =
        riga.getElementsByTagName("UnitaMisura")[0]?.textContent?.trim() || "pz"

      const codice =
        riga.getElementsByTagName("CodiceValore")[0]?.textContent?.trim() || ""

      const codiceNorm = normalizzaCodice(codice)

      if (!nome || !codiceNorm) {
        scartate++
        return
      }

      prodotti.set(codiceNorm, {
        supplier_code: codice.trim(),
        name: nome,
        unit: unit || "pz",
        price: prezzoNumero(prezzo),
        active: true,
        category: "Siver",
      })
    })

    return { scartate }
  }

  const menuItems = [
    { label: "Dashboard", icon: Home, action: () => vai("/admin-dashboard"), active: true },
    { label: "Anagrafica prodotti", icon: Package, action: () => vai("/admin-prodotti") },
    {
      label: "Entra come locale",
      icon: Home,
      action: () => {
        if (!localeId) {
          alert("Seleziona prima un locale")
          return
        }

        const locale = locali.find((l) => String(l.id) === String(localeId))

        if (!locale) {
          alert("Locale non trovato")
          return
        }

        localStorage.setItem("locale_id", locale.id)
        localStorage.setItem("locale_nome", locale.name)
        localStorage.setItem("admin_mode", "true")

        window.location.href = "/dashboard"
      },
    },
    { label: "Riepilogo ordini", icon: ShoppingCart, action: () => vai("/admin-ordini") },
    { label: "Ordini per locale", icon: Boxes, action: () => richiediLocale("/admin-ordini") },
    { label: "Storico ordini", icon: History, action: () => localeId ? richiediLocale("/admin-storico-ordini") : vai("/admin-storico-ordini") },
    { label: "Storico giacenze", icon: Package, action: () => richiediLocale("/storico-giacenze") },
    { label: "Storico consegne", icon: Truck, action: () => vai("/admin-storico-consegne") },
    { label: "Storico fatture", icon: FileText, action: () => vai("/admin-storico-fatture") },
    { label: "Consegne", icon: Truck, action: () => vai("/admin-consegne") },
    { label: "Soglie giacenze", icon: Boxes, action: () => vai("/admin-soglie-giacenze") },
    { label: "Messaggi", icon: MessageCircle, action: () => vai("/admin-messaggi") },
    { label: "Cancellazioni", icon: Trash2, action: () => vai("/admin-cancellazioni") },
    { label: "Statistiche", icon: BarChart3, action: () => vai("/admin-statistiche") },
    { label: "Alert", icon: AlertTriangle, action: () => vai("/admin-alert") },
    { label: "Estrazioni prodotti", icon: BarChart3, action: () => vai("/admin-estrazioni") },
  ]

  return (
    <main className="min-h-screen bg-[#f4f7fb]">
      <section className="mx-auto w-full max-w-[1600px] p-3 sm:p-5 lg:p-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-950 sm:text-5xl">
              Centro controllo
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Ordini, giacenze, anomalie e valore stimato
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-2xl bg-white p-4 shadow"
              title="Notifiche"
            >
              <Bell className="h-6 w-6 text-slate-800" />

              {notifications.filter((n) => !n.read).length > 0 && (
                <div className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-black text-white">
                  {notifications.filter((n) => !n.read).length}
                </div>
              )}
            </button>

            <button
              onClick={caricaDashboard}
              disabled={loadingDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-base font-black text-white disabled:bg-slate-400 sm:px-8 sm:py-4 sm:text-xl"
            >
              <RefreshCw className={`h-5 w-5 ${loadingDashboard ? "animate-spin" : ""}`} />
              {loadingDashboard ? "Aggiorno..." : "Aggiorna dati"}
            </button>
          </div>
        </div>

        {showNotifications && (
          <div className="mb-5 rounded-3xl bg-white p-5 shadow">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Notifiche</h2>
                <p className="text-sm font-bold text-slate-500">
                  {notifications.filter((n) => !n.read).length} non lette su {notifications.length}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={generaNotificheAdmin}
                  disabled={creazioneNotifiche}
                  className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-black text-white disabled:bg-slate-400"
                >
                  {creazioneNotifiche ? "Controllo..." : "Controlla ora"}
                </button>

                <button
                  onClick={segnaTutteLette}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white"
                >
                  Segna tutte lette
                </button>

                <button
                  onClick={() => setShowNotifications(false)}
                  className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-black text-slate-800"
                >
                  Chiudi
                </button>
              </div>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-2xl border p-4 ${n.read ? "border-slate-200 bg-slate-50" : coloreNotifica(n.severity)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-950">{n.title}</h3>
                        {!n.read && (
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                            Nuova
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm font-bold leading-5 text-slate-700">
                        {n.message}
                      </p>

                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {n.locale_nome || "Sistema"} · {testoData(n.created_at)}
                      </p>
                    </div>

                    {!n.read && (
                      <button
                        onClick={() => segnaLetta(n.id)}
                        className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"
                      >
                        Letta
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {notifications.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                  Nessuna notifica.
                </p>
              )}
            </div>
          </div>
        )}

        {erroreDashboard && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">
            {erroreDashboard}
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            type="date"
            value={dal}
            onChange={(e) => setDal(e.target.value)}
            className="rounded-2xl bg-white p-4 text-base font-bold text-slate-900 shadow sm:text-xl"
          />

          <input
            type="date"
            value={al}
            onChange={(e) => setAl(e.target.value)}
            className="rounded-2xl bg-white p-4 text-base font-bold text-slate-900 shadow sm:text-xl"
          />

          <select
            value={localeId}
            onChange={(e) => setLocaleId(e.target.value)}
            className="rounded-2xl bg-white p-4 text-base font-bold text-slate-900 shadow sm:text-xl"
          >
            <option value="">Tutti i locali</option>
            {locali.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca prodotto, codice, locale..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="w-full rounded-2xl bg-white p-4 pl-12 text-base font-bold text-slate-900 shadow placeholder:text-slate-400 sm:text-xl"
            />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <button
            onClick={mostraLocaliMancantiOrdini}
            className="rounded-3xl bg-white p-4 shadow flex items-center gap-4 text-left"
          >
            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-7 w-7 text-blue-600" />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700">Ordini ricevuti</p>
              <h2 className="text-3xl font-black text-slate-950">
                {ordiniFatti.length} / {locali.length}
              </h2>
              <p className="font-black text-green-600">{percentOrdini}% completato</p>
              <p className="mt-1 text-xs font-black text-blue-600">
                Tocca per vedere mancanti
              </p>
            </div>
          </button>

          <button
            onClick={mostraLocaliMancantiGiacenze}
            className="rounded-3xl bg-white p-4 shadow flex items-center gap-4 text-left"
          >
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Package className="h-7 w-7 text-green-600" />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700">Giacenze ricevute</p>
              <h2 className="text-3xl font-black text-slate-950">
                {giacenzeFatte.length} / {locali.length}
              </h2>
              <p className="font-black text-green-600">{percentGiacenze}% completato</p>
              <p className="mt-1 text-xs font-black text-green-600">
                Tocca per vedere mancanti
              </p>
            </div>
          </button>

          <div className="rounded-3xl bg-white p-4 shadow flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Boxes className="h-7 w-7 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Prodotti richiesti</p>
              <h2 className="text-3xl font-black text-slate-950">{totaleProdotti}</h2>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <BarChart3 className="h-7 w-7 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Totale quantità</p>
              <h2 className="text-3xl font-black text-slate-950">{totaleQuantita}</h2>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <Euro className="h-7 w-7 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Valore stimato</p>
              <h2 className="text-2xl font-black text-slate-950">
                {euro(valoreStimato)}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAnomalie(true)}
            className="flex items-center gap-4 rounded-3xl bg-white p-4 text-left shadow transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label={`Apri dettaglio anomalie: ${anomalieTotali} rilevate`}
          >
            <div className={`h-14 w-14 rounded-full flex items-center justify-center shrink-0 ${anomalieTotali > 0 ? "bg-red-100" : "bg-emerald-100"}`}>
              <AlertTriangle className={`h-7 w-7 ${anomalieTotali > 0 ? "text-red-600" : "text-emerald-600"}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Anomalie</p>
              <h2 className="text-3xl font-black text-slate-950">{anomalieTotali}</h2>
              <p className="mt-1 text-xs font-black text-blue-600">Tocca per vedere il dettaglio</p>
            </div>
          </button>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-3xl bg-white p-4 shadow sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-black text-slate-950">Controlli anagrafica</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="font-bold text-slate-700">Prodotti senza codice</span>
                <span className="font-black text-red-600">{prodottiSenzaCodice.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="font-bold text-slate-700">Prodotti senza prezzo</span>
                <span className="font-black text-amber-600">{prodottiSenzaPrezzo.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="font-bold text-slate-700">Prodotti attivi</span>
                <span className="font-black text-slate-950">{products.filter((p) => p.active !== false).length}</span>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <Download className="h-5 w-5 text-emerald-600" />
                <h3 className="font-black text-slate-950">Esporta prodotti DB</h3>
              </div>

              <input
                type="text"
                value={ricercaProdottiExport}
                onChange={(e) => setRicercaProdottiExport(e.target.value)}
                placeholder="Cerca codice o prodotto..."
                className="mb-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-900"
              />

              <select
                value={filtroStatoProdotti}
                onChange={(e) =>
                  setFiltroStatoProdotti(
                    e.target.value as
                      | "tutti"
                      | "attivi"
                      | "inattivi"
                      | "senza_codice"
                      | "senza_prezzo"
                  )
                }
                className="mb-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-900"
              >
                <option value="tutti">Tutti i prodotti</option>
                <option value="attivi">Solo attivi</option>
                <option value="inattivi">Solo inattivi</option>
                <option value="senza_codice">Senza codice</option>
                <option value="senza_prezzo">Senza prezzo</option>
              </select>

              <p className="mb-3 text-xs font-bold text-slate-500">
                Visualizzati per export: {prodottiAnagraficaFiltrati.length} / {products.length}
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => scaricaAnagraficaProdottiExcel(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  Scarica filtrati
                </button>

                <button
                  onClick={() => scaricaAnagraficaProdottiExcel(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-3 text-sm font-black text-white transition hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  Scarica tutti i prodotti
                </button>
              </div>

              <p className="mt-3 text-[11px] font-bold leading-4 text-slate-500">
                L&apos;export legge direttamente l&apos;anagrafica products e non dipende dal locale o dagli ordini.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-black text-slate-950">Controlli ordini</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="font-bold text-slate-700">Ordini senza codice</span>
                <span className="font-black text-red-600">{ordiniSenzaCodice.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="font-bold text-slate-700">Ordini senza prezzo</span>
                <span className="font-black text-amber-600">{ordiniSenzaPrezzo.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="font-bold text-slate-700">Consegne parziali / da fare</span>
                <span className="font-black text-blue-600">{consegneParziali.length} / {consegneDaFare.length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              {anomalieTotali > 0 ? (
                <XCircle className="h-6 w-6 text-red-600" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              )}
              <h2 className="text-xl font-black text-slate-950">Stato operativo</h2>
            </div>
            <p className="text-sm font-bold leading-6 text-slate-600">
              {anomalieTotali > 0
                ? "Ci sono anomalie da sistemare prima di usare report economici precisi."
                : "Anagrafica e ordini risultano puliti nel periodo selezionato."}
            </p>
            <button
              onClick={() => vai("/admin-consegne")}
              className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 font-black text-white"
            >
              Vai alle consegne
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-4 shadow sm:p-8">
            <h2 className="mb-4 text-2xl font-black text-slate-950 sm:text-3xl">
              Totale prodotti richiesti
            </h2>

            <div className="space-y-3">
              {prodottiRaggruppati.map((p: any) => (
                <div key={`${p.codice}-${p.nome}`} className="border-b pb-3">
                  <div className="flex justify-between gap-3">
                    <span className="font-bold text-slate-900">{p.nome}</span>
                    <span className="font-black text-slate-950">{p.quantita}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3 text-xs font-bold text-slate-500">
                    <span>{p.codice || "Senza codice"}</span>
                    <span>{euro(p.valore)}</span>
                  </div>
                </div>
              ))}

              {prodottiRaggruppati.length === 0 && (
                <p className="font-bold text-slate-600">Nessun dato nel periodo.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow overflow-hidden sm:p-8">
            <h2 className="mb-4 text-2xl font-black text-slate-950 sm:text-3xl">
              Ordini per locale
            </h2>

            <div className="h-72 overflow-x-auto overflow-y-hidden">
              <div className="flex h-full min-w-max items-end gap-4 pr-4">
                {ordiniPerLocale.map((l: any) => (
                  <div key={l.nome} className="flex w-24 shrink-0 flex-col items-center">
                    <div
                      className="w-full rounded-t-2xl bg-blue-600"
                      style={{
                        height: `${Math.min(Math.max(l.totale / 3, 10), 250)}px`,
                      }}
                    />

                    <span className="mt-2 text-center text-xs font-bold text-slate-700 break-words">
                      {l.nome}
                    </span>
                    <span className="text-[11px] font-black text-slate-500">
                      {euro(l.valore)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-3xl bg-white p-4 shadow sm:p-8">
          <div className="mb-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="h-7 w-7 text-blue-600" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">
                Import prezzi e fatture
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Apri la pagina dedicata per importare CSV, PDF fatture e pulire duplicati.
              </p>
            </div>
          </div>

          <button
            onClick={() => vai("/admin-import-prezzi")}
            className="rounded-2xl bg-blue-600 px-6 py-4 font-black text-white transition hover:bg-blue-700"
          >
            Apri import prezzi e fatture
          </button>
        </div>
      </section>

      {showAnomalie && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAnomalie(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titolo-anomalie"
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${anomalieTotali > 0 ? "bg-red-100" : "bg-emerald-100"}`}>
                  {anomalieTotali > 0 ? (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h2 id="titolo-anomalie" className="text-2xl font-black text-slate-950">
                    {anomalieTotali > 0 ? "Dettaglio anomalie" : "Nessuna anomalia"}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {anomalieTotali > 0
                      ? `${anomalieTotali} controlli da verificare. Un prodotto può comparire in più controlli.`
                      : "Anagrafica e ordini non presentano anomalie nei controlli attivi."}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    I controlli ordini e consegne rispettano i filtri della dashboard; i controlli prodotti riguardano l'intera anagrafica.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAnomalie(false)}
                className="shrink-0 rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
                aria-label="Chiudi dettaglio anomalie"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 p-4 sm:grid-cols-5 sm:p-6">
              {[
                { label: "Prodotti senza codice", valore: prodottiSenzaCodice.length, colore: "text-red-600" },
                { label: "Prodotti senza prezzo", valore: prodottiSenzaPrezzo.length, colore: "text-amber-600" },
                { label: "Ordini senza codice", valore: ordiniSenzaCodice.length, colore: "text-red-600" },
                { label: "Ordini senza prezzo", valore: ordiniSenzaPrezzo.length, colore: "text-amber-600" },
                { label: "Consegne parziali", valore: consegneParziali.length, colore: "text-blue-600" },
              ].map((voce) => (
                <div key={voce.label} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold leading-4 text-slate-500">{voce.label}</p>
                  <p className={`mt-1 text-2xl font-black ${voce.colore}`}>{voce.valore}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {prodottiSenzaCodice.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-red-100">
                  <div className="flex items-center justify-between bg-red-50 px-4 py-3">
                    <h3 className="font-black text-slate-950">Prodotti senza codice</h3>
                    <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                      {prodottiSenzaCodice.length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {prodottiSenzaCodice.map((prodotto: any) => (
                      <div key={String(prodotto.id || prodotto.name)} className="flex items-center justify-between gap-4 px-4 py-3">
                        <span className="min-w-0 truncate font-bold text-slate-800">{prodotto.name || "Prodotto senza nome"}</span>
                        <span className="shrink-0 text-xs font-bold text-red-600">Codice mancante</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {prodottiSenzaPrezzo.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-amber-100">
                  <div className="flex items-center justify-between bg-amber-50 px-4 py-3">
                    <h3 className="font-black text-slate-950">Prodotti senza prezzo</h3>
                    <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black text-white">
                      {prodottiSenzaPrezzo.length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {prodottiSenzaPrezzo.map((prodotto: any) => (
                      <div key={String(prodotto.id || prodotto.name)} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-bold text-slate-800">{prodotto.name || "Prodotto senza nome"}</span>
                        <span className="text-xs font-bold text-amber-700">
                          {prodotto.supplier_code || "Senza codice"} · Prezzo mancante
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {ordiniSenzaCodice.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-red-100">
                  <div className="flex items-center justify-between bg-red-50 px-4 py-3">
                    <h3 className="font-black text-slate-950">Ordini senza codice</h3>
                    <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                      {ordiniSenzaCodice.length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {ordiniSenzaCodice.map((ordine: any) => (
                      <div key={String(ordine.id)} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-bold text-slate-800">{ordine.nome_prodotto || "Prodotto senza nome"}</span>
                        <span className="text-xs font-bold text-slate-500">
                          {ordine.locale_nome || "Locale"} · Quantità {ordine.quantita || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {ordiniSenzaPrezzo.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-amber-100">
                  <div className="flex items-center justify-between bg-amber-50 px-4 py-3">
                    <h3 className="font-black text-slate-950">Ordini senza prezzo associato</h3>
                    <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black text-white">
                      {ordiniSenzaPrezzo.length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {ordiniSenzaPrezzo.map((ordine: any) => (
                      <div key={String(ordine.id)} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-bold text-slate-800">{ordine.nome_prodotto || "Prodotto senza nome"}</span>
                        <span className="text-xs font-bold text-slate-500">
                          {ordine.locale_nome || "Locale"} · {ordine.supplier_code || "Senza codice"} · Quantità {ordine.quantita || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {consegneParziali.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between bg-blue-50 px-4 py-3">
                    <h3 className="font-black text-slate-950">Consegne parziali</h3>
                    <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-black text-white">
                      {consegneParziali.length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {consegneParziali.map((ordine: any) => (
                      <div key={String(ordine.id)} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-bold text-slate-800">{ordine.nome_prodotto || "Prodotto senza nome"}</span>
                        <span className="text-xs font-bold text-slate-500">
                          {ordine.locale_nome || "Locale"} · Consegnati {ordine.quantita_consegnata || 0} / {ordine.quantita || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {anomalieTotali === 0 && (
                <div className="rounded-2xl bg-emerald-50 p-5 text-center font-bold text-emerald-700">
                  Non ci sono anomalie da correggere.
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:p-6">
              <button
                type="button"
                onClick={() => setShowAnomalie(false)}
                className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 transition hover:bg-slate-200"
              >
                Chiudi
              </button>
              <button
                type="button"
                onClick={() => vai("/admin-prodotti")}
                className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white transition hover:bg-emerald-700"
              >
                Correggi prodotti
              </button>
              <button
                type="button"
                onClick={() => vai("/admin-consegne")}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700"
              >
                Vai alle consegne
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}