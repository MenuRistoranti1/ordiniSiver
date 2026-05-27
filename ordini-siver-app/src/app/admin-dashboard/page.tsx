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
  }, [])

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

  function logout() {
    localStorage.removeItem("admin")
    window.location.href = "/"
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

      setRisultatoImport(
        `Import completato. File letti: ${fileLetti}. Prodotti inseriti/aggiornati: ${prodottiDaSalvare.length}. Righe scartate: ${righeScartate}.`
      )

      await caricaDashboard()
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
    <main className="min-h-screen bg-[#f4f7fb] lg:flex">
      <aside className="hidden lg:flex w-72 bg-[#07132b] text-white min-h-screen p-6 fixed left-0 top-0 flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-black">Ordini</h1>
          <p className="text-slate-300">Gestione Ordini</p>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto pr-1">
          {menuItems.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 font-semibold ${
                  item.active ? "bg-blue-600 text-white" : "hover:bg-[#16213f]"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <button onClick={logout} className="mt-4 bg-red-500 p-4 rounded-2xl font-bold">
          Logout
        </button>
      </aside>

      <section className="w-full p-3 sm:p-5 lg:ml-72 lg:p-8">
        <div className="lg:hidden mb-4 rounded-3xl bg-[#07132b] p-4 text-white shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black">Ordini</h1>
              <p className="text-sm font-semibold text-slate-300">
                Dashboard admin
              </p>
            </div>

            <button
              onClick={() => setMenuAperto(!menuAperto)}
              className="rounded-2xl bg-blue-600 p-3"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {menuAperto && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon

                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className={`rounded-2xl p-3 text-left text-xs font-bold flex flex-col gap-2 ${
                      item.active ? "bg-blue-600" : "bg-[#16213f]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                )
              })}

              <button
                onClick={logout}
                className="col-span-2 rounded-2xl bg-red-500 p-3 text-sm font-black"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-950 sm:text-5xl">
              Centro controllo
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Ordini, giacenze, anomalie e valore stimato
            </p>
          </div>

          <button
            onClick={caricaDashboard}
            disabled={loadingDashboard}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-base font-black text-white disabled:bg-slate-400 sm:px-8 sm:py-4 sm:text-xl"
          >
            <RefreshCw className={`h-5 w-5 ${loadingDashboard ? "animate-spin" : ""}`} />
            {loadingDashboard ? "Aggiorno..." : "Aggiorna dati"}
          </button>
        </div>

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

          <div className="rounded-3xl bg-white p-4 shadow flex items-center gap-4">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center shrink-0 ${anomalieTotali > 0 ? "bg-red-100" : "bg-emerald-100"}`}>
              <AlertTriangle className={`h-7 w-7 ${anomalieTotali > 0 ? "text-red-600" : "text-emerald-600"}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Anomalie</p>
              <h2 className="text-3xl font-black text-slate-950">{anomalieTotali}</h2>
              <p className="mt-1 text-xs font-black text-slate-500">Codici, prezzi, consegne</p>
            </div>
          </div>
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

            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">
              Import prodotti e prezzi
            </h2>
          </div>

          <input
            type="file"
            accept=".zip,.xml"
            onChange={(e) => setFileXml(e.target.files?.[0] || null)}
            className="mb-4 w-full rounded-2xl border p-4 font-bold text-slate-900"
          />

          <button
            onClick={importaProdotti}
            disabled={loadingImport}
            className="rounded-2xl bg-blue-600 px-6 py-4 font-black text-white disabled:bg-gray-400"
          >
            {loadingImport ? "Importazione..." : "Importa prodotti"}
          </button>

          {risultatoImport && (
            <div className="mt-4 rounded-2xl bg-green-100 p-4 font-bold text-green-800">
              {risultatoImport}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}