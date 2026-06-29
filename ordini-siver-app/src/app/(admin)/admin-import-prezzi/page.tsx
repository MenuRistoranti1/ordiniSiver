"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type CsvRow = Record<string, string>

type PdfPreviewRow = {
  supplier_code: string
  product_name: string
  quantity: number
  price: number
  discount?: number
  total?: number
  vat?: number
  matched?: boolean
  product_id?: string | null
  old_price?: number | null
  variation_percent?: number | null
}

export default function AdminImportPrezzi() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [risultato, setRisultato] = useState("")
  const [errore, setErrore] = useState("")

  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [ricerca, setRicerca] = useState("")
  const [filtro, setFiltro] = useState("duplicati")

  const [pdfPreview, setPdfPreview] = useState<PdfPreviewRow[]>([])
  const [pdfInfo, setPdfInfo] = useState<any>(null)

  useEffect(() => {
    caricaProdotti()
  }, [])

  async function caricaProdotti() {
    setLoadingProducts(true)

    const { data, error } = await supabase
      .from("products")
      .select("id, name, supplier_code, price, active, category, unit")
      .order("name", { ascending: true })

    if (error) {
      console.log(error)
      setErrore("Errore caricamento prodotti")
      setLoadingProducts(false)
      return
    }

    setProducts(data || [])
    setLoadingProducts(false)
  }

  function normalizza(testo: string) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\[duplicato archiviato\]/gi, "")
      .replace(/\[archiviato\]/gi, "")
      .replace(/duplicato archiviato/gi, "")
      .replace(/archiviato/gi, "")
      .replace(/duplicato/gi, "")
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
    const numero = Number(String(prezzo || "0").replace("€", "").replace(",", "."))
    return Number.isFinite(numero) ? numero : 0
  }

  function euro(valore: any) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(prezzoNumero(valore))
  }

  function prodottoArchiviato(prodotto: any) {
    const nome = String(prodotto.name || "").toUpperCase()
    const codice = String(prodotto.supplier_code || "").toUpperCase()

    return (
      prodotto.active === false ||
      nome.includes("DUPLICATO ARCHIVIATO") ||
      nome.includes("[DUPLICATO ARCHIVIATO]") ||
      nome.includes("[ARCHIVIATO]") ||
      nome.includes("ARCHIVIATO") ||
      codice.includes("__DUP__")
    )
  }

  function parseCSV(text: string): CsvRow[] {
    const righe = text
      .replace(/\r/g, "")
      .split("\n")
      .filter((r) => r.trim() !== "")

    if (righe.length === 0) return []

    const separatore = righe[0].includes(";") ? ";" : ","
    const headers = righe[0].split(separatore).map((h) => h.trim())

    return righe.slice(1).map((riga) => {
      const valori = riga.split(separatore).map((v) => v.trim())
      const obj: CsvRow = {}

      headers.forEach((h, i) => {
        obj[h] = valori[i] || ""
      })

      return obj
    })
  }

  async function creaNotifica({
    type,
    title,
    message,
    severity = "info",
    source = "admin-import-prezzi",
    source_id,
  }: {
    type: string
    title: string
    message: string
    severity?: string
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

    await supabase.from("notifications").insert({
      type,
      title,
      message,
      severity,
      read: false,
      source,
      source_id,
    })
  }

  async function importaPrezziCSV() {
    if (!file) {
      alert("Seleziona prima un file CSV")
      return
    }

    setLoading(true)
    setRisultato("")
    setErrore("")
    setPdfPreview([])
    setPdfInfo(null)

    try {
      const text = await file.text()
      const righe = parseCSV(text)

      let aggiornati = 0
      let nonTrovati = 0
      let saltati = 0
      let variazioniImportanti = 0

      for (const riga of righe) {
        const codice = String(
          riga["CodiceArticolo"] ||
            riga["supplier_code"] ||
            riga["Codice"] ||
            riga["codice"] ||
            ""
        ).trim()

        const prezzoTesto = String(
          riga["PrezzoUnitario"] ||
            riga["price"] ||
            riga["Prezzo"] ||
            riga["prezzo"] ||
            ""
        ).trim()

        if (!codice || !prezzoTesto) {
          saltati++
          continue
        }

        const prezzo = prezzoNumero(prezzoTesto)

        if (!prezzo || prezzo <= 0) {
          saltati++
          continue
        }

        const { data: prodottiTrovati, error: findError } = await supabase
          .from("products")
          .select("id, name, supplier_code, price, active")
          .eq("supplier_code", codice)
          .eq("active", true)

        if (findError) {
          console.log(findError)
          saltati++
          continue
        }

        const prodottiValidi = (prodottiTrovati || []).filter(
          (p: any) => !prodottoArchiviato(p)
        )

        if (prodottiValidi.length === 0) {
          nonTrovati++

          await creaNotifica({
            type: "price_import_code_not_found",
            title: "Codice prezzo non trovato",
            message: `Nel CSV prezzi il codice ${codice} non corrisponde a nessun prodotto attivo.`,
            severity: "warning",
            source_id: `not-found-${codice}`,
          })

          continue
        }

        for (const prodotto of prodottiValidi) {
          const prezzoVecchio = prezzoNumero(prodotto.price)
          const variazione =
            prezzoVecchio > 0 ? ((prezzo - prezzoVecchio) / prezzoVecchio) * 100 : 0

          const { error: updateError } = await supabase
            .from("products")
            .update({ price: prezzo })
            .eq("id", prodotto.id)

          if (updateError) {
            console.log(updateError)
            saltati++
            continue
          }

          aggiornati++

          if (prezzoVecchio > 0 && Math.abs(variazione) >= 10) {
            variazioniImportanti++

            await supabase.from("product_price_history").insert({
              product_id: prodotto.id,
              supplier_code: prodotto.supplier_code,
              product_name: prodotto.name,
              old_price: prezzoVecchio,
              new_price: prezzo,
              variation_percent: variazione,
              source: "import_prezzi_csv",
            })

            await creaNotifica({
              type: variazione > 0 ? "price_increase" : "price_decrease",
              title: variazione > 0 ? "Aumento prezzo importante" : "Diminuzione prezzo importante",
              message: `${prodotto.name}: da ${euro(prezzoVecchio)} a ${euro(prezzo)} (${variazione.toFixed(1)}%).`,
              severity: variazione > 0 ? "danger" : "info",
              source: "product_price_history",
              source_id: `price-${prodotto.id}-${prezzoVecchio}-${prezzo}`,
            })
          }
        }
      }

      const messaggio = `Import CSV completato. Prodotti aggiornati: ${aggiornati}. Codici non trovati: ${nonTrovati}. Righe saltate: ${saltati}. Variazioni importanti: ${variazioniImportanti}.`

      setRisultato(messaggio)

      await creaNotifica({
        type: "price_import_completed",
        title: "Import prezzi completato",
        message: messaggio,
        severity: nonTrovati > 0 || variazioniImportanti > 0 ? "warning" : "success",
        source_id: `import-${Date.now()}`,
      })

      await caricaProdotti()
    } catch (error: any) {
      console.log(error)
      setErrore(error?.message || "Errore durante import prezzi")
    }

    setLoading(false)
  }

  async function importaFatturaPDF() {
    if (!file) {
      alert("Seleziona prima una fattura PDF")
      return
    }

    setLoading(true)
    setRisultato("")
    setErrore("")
    setPdfPreview([])
    setPdfInfo(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/import-invoice-pdf", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || "Errore import PDF")
      }

      setPdfInfo(json.invoice || null)
      setPdfPreview(json.rows || [])

      setRisultato(
        `Import PDF completato. Righe lette: ${json.rows_count}. Prodotti aggiornati: ${json.updated}. Codici non trovati: ${json.not_found}. Variazioni importanti: ${json.important_changes}.`
      )

      await caricaProdotti()
    } catch (error: any) {
      console.log(error)
      setErrore(error?.message || "Errore durante import fattura PDF")
    }

    setLoading(false)
  }

  function importaFile() {
    if (!file) {
      alert("Seleziona prima un file")
      return
    }

    const nome = file.name.toLowerCase()

    if (nome.endsWith(".pdf")) {
      importaFatturaPDF()
      return
    }

    if (nome.endsWith(".csv")) {
      importaPrezziCSV()
      return
    }

    alert("Formato non supportato. Carica PDF o CSV.")
  }

  async function archiviaProdotto(prodotto: any) {
    const conferma = confirm(
      `Archiviare il prodotto "${prodotto.name}"? Non comparirà più ai locali.`
    )

    if (!conferma) return

    const nuovoNome = prodotto.name?.includes("[DUPLICATO ARCHIVIATO]")
      ? prodotto.name
      : `${prodotto.name} [DUPLICATO ARCHIVIATO]`

    const nuovoCodice = String(prodotto.supplier_code || "").includes("__DUP__")
      ? prodotto.supplier_code
      : `${prodotto.supplier_code || "senza-codice"}__DUP__${prodotto.id}`

    const { error } = await supabase
      .from("products")
      .update({
        active: false,
        name: nuovoNome,
        supplier_code: nuovoCodice,
      })
      .eq("id", prodotto.id)

    if (error) {
      console.log(error)
      alert("Errore archiviazione prodotto")
      return
    }

    await creaNotifica({
      type: "product_archived",
      title: "Prodotto archiviato",
      message: `${prodotto.name} è stato archiviato come duplicato.`,
      severity: "info",
      source: "products",
      source_id: String(prodotto.id),
    })

    await caricaProdotti()
  }

  async function riattivaProdotto(prodotto: any) {
    const conferma = confirm(`Riattivare il prodotto "${prodotto.name}"?`)
    if (!conferma) return

    const nomePulito = String(prodotto.name || "")
      .replace(/\[DUPLICATO ARCHIVIATO\]/gi, "")
      .replace(/\[ARCHIVIATO\]/gi, "")
      .replace(/DUPLICATO ARCHIVIATO/gi, "")
      .trim()

    const codicePulito = String(prodotto.supplier_code || "").split("__DUP__")[0]

    const { error } = await supabase
      .from("products")
      .update({
        active: true,
        name: nomePulito || prodotto.name,
        supplier_code: codicePulito || prodotto.supplier_code,
      })
      .eq("id", prodotto.id)

    if (error) {
      console.log(error)
      alert("Errore riattivazione prodotto")
      return
    }

    await caricaProdotti()
  }

  const gruppiDuplicati = useMemo(() => {
    const gruppi: Record<string, any[]> = {}

    products.forEach((prodotto) => {
      const chiaveCodice = normalizzaCodice(prodotto.supplier_code || "")
      const chiaveNome = normalizza(prodotto.name || "")
      const chiave = chiaveCodice || chiaveNome

      if (!chiave) return

      if (!gruppi[chiave]) gruppi[chiave] = []
      gruppi[chiave].push(prodotto)
    })

    return Object.values(gruppi)
      .filter((gruppo) => gruppo.length > 1)
      .sort((a, b) => b.length - a.length)
  }, [products])

  const prodottiFiltrati = useMemo(() => {
    let lista = [...products]

    if (filtro === "duplicati") {
      const idsDuplicati = new Set(
        gruppiDuplicati.flatMap((gruppo) => gruppo.map((p) => String(p.id)))
      )
      lista = lista.filter((p) => idsDuplicati.has(String(p.id)))
    }

    if (filtro === "archiviati") {
      lista = lista.filter((p) => prodottoArchiviato(p))
    }

    if (filtro === "attivi") {
      lista = lista.filter((p) => !prodottoArchiviato(p))
    }

    if (filtro === "senza-prezzo") {
      lista = lista.filter((p) => !prodottoArchiviato(p) && prezzoNumero(p.price) <= 0)
    }

    if (filtro === "senza-codice") {
      lista = lista.filter(
        (p) =>
          !prodottoArchiviato(p) &&
          (!p.supplier_code || String(p.supplier_code).trim() === "-")
      )
    }

    if (ricerca.trim()) {
      const r = normalizza(ricerca)
      const rc = normalizzaCodice(ricerca)

      lista = lista.filter(
        (p) =>
          normalizza(p.name || "").includes(r) ||
          normalizzaCodice(p.supplier_code || "").includes(rc)
      )
    }

    return lista.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    )
  }, [products, filtro, ricerca, gruppiDuplicati])

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black sm:text-5xl">
                Import prezzi e fatture
              </h1>
              <p className="mt-2 text-sm font-bold text-slate-300 sm:text-lg">
                Carica CSV o PDF fattura, aggiorna prezzi, controlla duplicati e archivia prodotti non corretti.
              </p>
            </div>

            <button
              onClick={() => (window.location.href = "/admin-dashboard")}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"
            >
              Torna dashboard
            </button>
          </div>
        </section>

        {errore && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">
            {errore}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm font-black uppercase text-slate-500">
              Prodotti totali
            </p>
            <h2 className="mt-2 text-4xl font-black text-slate-950">
              {products.length}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm font-black uppercase text-slate-500">
              Gruppi duplicati
            </p>
            <h2 className="mt-2 text-4xl font-black text-red-600">
              {gruppiDuplicati.length}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm font-black uppercase text-slate-500">
              Archiviati / inattivi
            </p>
            <h2 className="mt-2 text-4xl font-black text-amber-600">
              {products.filter((p) => prodottoArchiviato(p)).length}
            </h2>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow sm:p-8">
          <h2 className="mb-2 text-2xl font-black text-slate-950">
            Import CSV o PDF fattura
          </h2>

          <p className="mb-5 text-sm font-bold text-slate-500">
            CSV: CodiceArticolo / PrezzoUnitario. PDF: fatture Siver con tabella codice, prodotto, quantità e prezzo.
          </p>

          <input
            type="file"
            accept=".csv,.pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null)
              setPdfPreview([])
              setPdfInfo(null)
              setRisultato("")
              setErrore("")
            }}
            className="mb-4 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-base font-bold text-slate-900"
          />

          <button
            onClick={importaFile}
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 p-5 text-xl font-black text-white disabled:bg-gray-400"
          >
            {loading ? "Importazione in corso..." : "Importa file"}
          </button>

          {risultato && (
            <div className="mt-5 rounded-2xl border border-green-300 bg-green-50 p-5 text-base font-black text-green-800">
              {risultato}
            </div>
          )}
        </section>

        {pdfPreview.length > 0 && (
          <section className="rounded-3xl bg-white p-5 shadow sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">
              Anteprima fattura importata
            </h2>

            {pdfInfo && (
              <p className="mt-1 text-sm font-bold text-slate-500">
                Fattura {pdfInfo.invoice_number || "-"} · Data {pdfInfo.invoice_date || "-"} · Destinazione {pdfInfo.destination || "-"}
              </p>
            )}

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[130px_1fr_90px_100px_110px_110px] bg-slate-950 text-xs font-black uppercase text-white lg:grid">
                <div className="p-3">Codice</div>
                <div className="p-3">Prodotto</div>
                <div className="p-3">Q.tà</div>
                <div className="p-3">Prezzo</div>
                <div className="p-3">Variaz.</div>
                <div className="p-3">Stato</div>
              </div>

              <div className="divide-y divide-slate-100">
                {pdfPreview.map((riga, index) => (
                  <div
                    key={`${riga.supplier_code}-${index}`}
                    className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-[130px_1fr_90px_100px_110px_110px] lg:items-center"
                  >
                    <div className="text-xs font-black text-slate-500">
                      {riga.supplier_code}
                    </div>
                    <div className="font-black text-slate-950">
                      {riga.product_name}
                    </div>
                    <div className="font-bold text-slate-700">
                      {riga.quantity}
                    </div>
                    <div className="font-bold text-slate-700">
                      {euro(riga.price)}
                    </div>
                    <div className="font-bold text-slate-700">
                      {riga.variation_percent === null || riga.variation_percent === undefined
                        ? "-"
                        : `${Number(riga.variation_percent).toFixed(1)}%`}
                    </div>
                    <div>
                      {riga.matched ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                          Abbinato
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                          Non trovato
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white p-5 shadow sm:p-8">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Pulizia prodotti
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Archivia duplicati e prodotti vecchi senza eliminarli dal database.
              </p>
            </div>

            <button
              onClick={caricaProdotti}
              disabled={loadingProducts}
              className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white disabled:bg-slate-400"
            >
              {loadingProducts ? "Aggiorno..." : "Aggiorna lista"}
            </button>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <input
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca nome o codice..."
              className="h-14 rounded-2xl border-2 border-slate-200 px-4 text-base font-bold outline-none focus:border-blue-600 lg:col-span-2"
            />

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="h-14 rounded-2xl border-2 border-slate-200 px-4 text-base font-bold outline-none focus:border-blue-600"
            >
              <option value="duplicati">Solo duplicati</option>
              <option value="attivi">Solo attivi</option>
              <option value="archiviati">Solo archiviati</option>
              <option value="senza-prezzo">Senza prezzo</option>
              <option value="senza-codice">Senza codice</option>
              <option value="tutti">Tutti</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[170px_1fr_130px_120px_180px] bg-slate-950 text-xs font-black uppercase tracking-wide text-white lg:grid">
              <div className="p-3">Codice</div>
              <div className="p-3">Prodotto</div>
              <div className="p-3">Prezzo</div>
              <div className="p-3">Stato</div>
              <div className="p-3">Azione</div>
            </div>

            <div className="divide-y divide-slate-100">
              {prodottiFiltrati.map((prodotto) => {
                const archiviato = prodottoArchiviato(prodotto)

                return (
                  <div
                    key={prodotto.id}
                    className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-[170px_1fr_130px_120px_180px] lg:items-center"
                  >
                    <div className="break-words text-xs font-black text-slate-500">
                      {prodotto.supplier_code || "-"}
                    </div>

                    <div>
                      <p className="font-black text-slate-950">
                        {prodotto.name || "Prodotto"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {prodotto.category || "Senza categoria"} · {prodotto.unit || "pz"}
                      </p>
                    </div>

                    <div className="font-black text-slate-800">
                      {euro(prodotto.price)}
                    </div>

                    <div>
                      {archiviato ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                          Archiviato
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                          Attivo
                        </span>
                      )}
                    </div>

                    <div>
                      {archiviato ? (
                        <button
                          onClick={() => riattivaProdotto(prodotto)}
                          className="w-full rounded-xl bg-green-600 px-3 py-2 text-sm font-black text-white"
                        >
                          Riattiva
                        </button>
                      ) : (
                        <button
                          onClick={() => archiviaProdotto(prodotto)}
                          className="w-full rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white"
                        >
                          Archivia
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {prodottiFiltrati.length === 0 && (
                <div className="p-8 text-center font-bold text-slate-500">
                  Nessun prodotto trovato.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}