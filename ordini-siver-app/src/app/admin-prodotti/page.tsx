"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  LogOut,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Prodotto = {
  id: string | number
  name: string | null
  supplier_code: string | null
  category: string | null
  unit: string | null
  price: string | number | null
  active: boolean | null
}

type FormProdotto = {
  id: string
  name: string
  supplier_code: string
  category: string
  unit: string
  price: string
  active: boolean
}

const FORM_VUOTO: FormProdotto = {
  id: "",
  name: "",
  supplier_code: "",
  category: "Siver",
  unit: "pz",
  price: "",
  active: true,
}

export default function AdminProdotti() {
  const [products, setProducts] = useState<Prodotto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState("")
  const [messaggio, setMessaggio] = useState("")
  const [ricerca, setRicerca] = useState("")
  const [filtro, setFiltro] = useState("tutti")
  const [ordinamento, setOrdinamento] = useState("nome")
  const [editorAperto, setEditorAperto] = useState(false)
  const [form, setForm] = useState<FormProdotto>(FORM_VUOTO)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    caricaProdotti()
  }, [])

  async function caricaProdotti() {
    setLoading(true)
    setErrore("")

    const { data, error } = await supabase
      .from("products")
      .select("id, name, supplier_code, category, unit, price, active")
      .order("name")

    if (error) {
      console.error(error)
      setErrore("Impossibile caricare l'anagrafica prodotti.")
    } else {
      setProducts((data || []) as Prodotto[])
    }

    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

  function normalizza(testo: unknown) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  function normalizzaCodice(codice: unknown) {
    return String(codice || "").trim().toLowerCase().replace(/\s+/g, "")
  }

  function prezzoNumero(prezzo: unknown) {
    const numero = Number(String(prezzo || "0").replace(",", "."))
    return Number.isFinite(numero) ? numero : 0
  }

  function euro(valore: unknown) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(prezzoNumero(valore))
  }

  const prodottiFiltrati = useMemo(() => {
    const query = normalizza(ricerca)

    const risultato = products.filter((prodotto) => {
      const testo = normalizza(
        [prodotto.supplier_code, prodotto.name, prodotto.category, prodotto.unit]
          .filter(Boolean)
          .join(" ")
      )

      if (query && !testo.includes(query)) return false
      if (filtro === "attivi" && prodotto.active === false) return false
      if (filtro === "inattivi" && prodotto.active !== false) return false
      if (filtro === "senza_codice" && normalizzaCodice(prodotto.supplier_code)) return false
      if (filtro === "senza_prezzo" && prezzoNumero(prodotto.price) > 0) return false

      return true
    })

    return risultato.sort((a, b) => {
      if (ordinamento === "codice") {
        return String(a.supplier_code || "").localeCompare(String(b.supplier_code || ""), "it")
      }
      if (ordinamento === "prezzo_desc") {
        return prezzoNumero(b.price) - prezzoNumero(a.price)
      }
      if (ordinamento === "prezzo_asc") {
        return prezzoNumero(a.price) - prezzoNumero(b.price)
      }
      return String(a.name || "").localeCompare(String(b.name || ""), "it")
    })
  }, [products, ricerca, filtro, ordinamento])

  const attivi = products.filter((p) => p.active !== false).length
  const senzaCodice = products.filter((p) => !normalizzaCodice(p.supplier_code)).length
  const senzaPrezzo = products.filter((p) => prezzoNumero(p.price) <= 0).length

  function nuovoProdotto() {
    setForm(FORM_VUOTO)
    setMessaggio("")
    setErrore("")
    setEditorAperto(true)
  }

  function modificaProdotto(prodotto: Prodotto) {
    setForm({
      id: String(prodotto.id),
      name: prodotto.name || "",
      supplier_code: prodotto.supplier_code || "",
      category: prodotto.category || "",
      unit: prodotto.unit || "",
      price: String(prodotto.price ?? ""),
      active: prodotto.active !== false,
    })
    setMessaggio("")
    setErrore("")
    setEditorAperto(true)
  }

  async function salvaProdotto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessaggio("")
    setErrore("")

    if (!form.name.trim()) {
      setErrore("Inserisci il nome del prodotto.")
      return
    }

    const codice = normalizzaCodice(form.supplier_code)
    const duplicato = codice
      ? products.find(
          (p) => normalizzaCodice(p.supplier_code) === codice && String(p.id) !== form.id
        )
      : null

    if (duplicato) {
      setErrore(`Il codice ${form.supplier_code.trim()} è già associato a ${duplicato.name || "un altro prodotto"}.`)
      return
    }

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      supplier_code: form.supplier_code.trim() || null,
      category: form.category.trim() || null,
      unit: form.unit.trim() || "pz",
      price: prezzoNumero(form.price),
      active: form.active,
    }

    const risultato = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload)

    if (risultato.error) {
      console.error(risultato.error)
      setErrore(`Errore salvataggio prodotto: ${risultato.error.message}`)
      setSaving(false)
      return
    }

    setMessaggio(form.id ? "Prodotto aggiornato correttamente." : "Prodotto aggiunto correttamente.")
    setEditorAperto(false)
    await caricaProdotti()
    setSaving(false)
  }

  async function cambiaStato(prodotto: Prodotto) {
    setErrore("")
    setMessaggio("")

    const nuovoStato = prodotto.active === false
    const { error } = await supabase
      .from("products")
      .update({ active: nuovoStato })
      .eq("id", prodotto.id)

    if (error) {
      setErrore(`Errore aggiornamento stato: ${error.message}`)
      return
    }

    setMessaggio(nuovoStato ? "Prodotto attivato." : "Prodotto disattivato.")
    await caricaProdotti()
  }

  async function eliminaProdotto(prodotto: Prodotto) {
    setErrore("")
    setMessaggio("")

    const nomeProdotto = prodotto.name || "Prodotto senza nome"
    const conferma = window.confirm(
      `Vuoi cancellare definitivamente “${nomeProdotto}”?\n\nLa cancellazione è consentita solo se il prodotto non è già presente negli ordini.`
    )

    if (!conferma) return

    setDeletingId(String(prodotto.id))

    try {
      let controllo = supabase
        .from("ordini")
        .select("id", { count: "exact", head: true })

      if (normalizzaCodice(prodotto.supplier_code)) {
        controllo = controllo.ilike("supplier_code", String(prodotto.supplier_code).trim())
      } else {
        controllo = controllo.ilike("nome_prodotto", nomeProdotto.trim())
      }

      const { count, error: erroreControllo } = await controllo

      if (erroreControllo) throw erroreControllo

      if ((count || 0) > 0) {
        setErrore(
          `Non puoi cancellare “${nomeProdotto}” perché è già presente in ${count} ordine/i. Usa Disattiva per conservarne lo storico.`
        )
        return
      }

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", prodotto.id)

      if (error) throw error

      setMessaggio(`Prodotto “${nomeProdotto}” cancellato definitivamente.`)
      await caricaProdotti()
    } catch (error: any) {
      console.error(error)
      setErrore(`Errore cancellazione prodotto: ${error?.message || "operazione non riuscita"}`)
    } finally {
      setDeletingId(null)
    }
  }

  async function esportaExcel(esportaTutti: boolean) {
    const righe = esportaTutti ? products : prodottiFiltrati

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
      { header: "Categoria", key: "categoria", width: 20 },
      { header: "Unità", key: "unita", width: 14 },
      { header: "Prezzo", key: "prezzo", width: 16 },
      { header: "Stato", key: "stato", width: 14 },
      { header: "Controllo", key: "controllo", width: 30 },
    ]

    righe
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "it"))
      .forEach((prodotto) => {
        const anomalie = []
        if (!normalizzaCodice(prodotto.supplier_code)) anomalie.push("Senza codice")
        if (prezzoNumero(prodotto.price) <= 0) anomalie.push("Senza prezzo")

        worksheet.addRow({
          codice: prodotto.supplier_code || "",
          nome: prodotto.name || "",
          categoria: prodotto.category || "",
          unita: prodotto.unit || "",
          prezzo: prezzoNumero(prodotto.price),
          stato: prodotto.active === false ? "Inattivo" : "Attivo",
          controllo: anomalie.join("; ") || "OK",
        })
      })

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    }
    worksheet.getRow(1).height = 26
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" }
    worksheet.getColumn("prezzo").numFmt = '€ #,##0.00'
    worksheet.views = [{ state: "frozen", ySplit: 1 }]
    worksheet.autoFilter = { from: "A1", to: "G1" }

    const dataOggi = new Date().toISOString().split("T")[0]
    const nomeFile = esportaTutti
      ? `anagrafica-prodotti-completa-${dataOggi}.xlsx`
      : `anagrafica-prodotti-filtrata-${dataOggi}.xlsx`

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = nomeFile
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/admin-dashboard")}
              className="rounded-2xl bg-slate-100 p-3 text-slate-700 transition hover:bg-slate-200"
              title="Torna alla dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-950 sm:text-4xl">Anagrafica prodotti</h1>
              <p className="text-sm font-bold text-slate-500">Codici, prezzi e prodotti Siver</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={caricaProdotti}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-slate-700 ring-1 ring-slate-200 disabled:text-slate-400"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-3 font-black text-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl p-4 sm:p-8">
        {errore && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {errore}
          </div>
        )}
        {messaggio && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">
            {messaggio}
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Totale prodotti</p>
            <p className="mt-2 text-4xl font-black text-slate-950">{products.length}</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Prodotti attivi</p>
            <p className="mt-2 text-4xl font-black text-emerald-600">{attivi}</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Senza codice</p>
            <p className="mt-2 text-4xl font-black text-red-600">{senzaCodice}</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">Senza prezzo</p>
            <p className="mt-2 text-4xl font-black text-amber-600">{senzaPrezzo}</p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-4 shadow sm:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-black text-slate-950">Elenco prodotti</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => esportaExcel(false)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Excel filtrati
              </button>
              <button
                onClick={() => esportaExcel(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Excel tutti
              </button>
              <button
                onClick={nuovoProdotto}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
              >
                <Plus className="h-4 w-4" />
                Nuovo prodotto
              </button>
            </div>
          </div>

          <div className="mb-5 grid gap-3 lg:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca codice, nome o categoria..."
                className="w-full rounded-2xl border border-slate-200 p-4 pl-12 font-bold text-slate-950"
              />
            </div>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="rounded-2xl border border-slate-200 p-4 font-bold text-slate-950"
            >
              <option value="tutti">Tutti i prodotti</option>
              <option value="attivi">Solo attivi</option>
              <option value="inattivi">Solo inattivi</option>
              <option value="senza_codice">Senza codice</option>
              <option value="senza_prezzo">Senza prezzo</option>
            </select>
            <select
              value={ordinamento}
              onChange={(e) => setOrdinamento(e.target.value)}
              className="rounded-2xl border border-slate-200 p-4 font-bold text-slate-950"
            >
              <option value="nome">Ordina per nome</option>
              <option value="codice">Ordina per codice</option>
              <option value="prezzo_desc">Prezzo più alto</option>
              <option value="prezzo_asc">Prezzo più basso</option>
            </select>
          </div>

          <p className="mb-4 text-sm font-bold text-slate-500">
            Prodotti visualizzati: {prodottiFiltrati.length} / {products.length}
          </p>

          {loading ? (
            <p className="rounded-2xl bg-slate-50 p-5 font-bold text-slate-600">Caricamento prodotti...</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Codice</th>
                    <th className="px-4 py-4">Prodotto</th>
                    <th className="px-4 py-4">Categoria</th>
                    <th className="px-4 py-4">Unità</th>
                    <th className="px-4 py-4 text-right">Prezzo</th>
                    <th className="px-4 py-4">Stato</th>
                    <th className="px-4 py-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prodottiFiltrati.map((prodotto) => (
                    <tr key={String(prodotto.id)} className="text-sm font-bold text-slate-700">
                      <td className="px-4 py-4">
                        {prodotto.supplier_code || (
                          <span className="text-red-600">Senza codice</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-950">{prodotto.name || "-"}</td>
                      <td className="px-4 py-4">{prodotto.category || "-"}</td>
                      <td className="px-4 py-4">{prodotto.unit || "-"}</td>
                      <td className="px-4 py-4 text-right">
                        {prezzoNumero(prodotto.price) > 0 ? (
                          euro(prodotto.price)
                        ) : (
                          <span className="text-amber-600">Mancante</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {prodotto.active === false ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">Inattivo</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Attivo</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => modificaProdotto(prodotto)}
                            className="rounded-xl bg-blue-50 p-2 text-blue-700"
                            title="Modifica prodotto"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => cambiaStato(prodotto)}
                            className={`rounded-xl px-3 py-2 text-xs font-black ${
                              prodotto.active === false
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {prodotto.active === false ? "Attiva" : "Disattiva"}
                          </button>
                          <button
                            onClick={() => eliminaProdotto(prodotto)}
                            disabled={deletingId === String(prodotto.id)}
                            className="rounded-xl bg-red-50 p-2 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Cancella definitivamente prodotto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {prodottiFiltrati.length === 0 && (
                <p className="p-6 text-center font-bold text-slate-500">Nessun prodotto trovato.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {editorAperto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-slate-950">
                {form.id ? "Modifica prodotto" : "Nuovo prodotto"}
              </h2>
              <button
                onClick={() => setEditorAperto(false)}
                className="rounded-xl bg-slate-100 p-2 text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={salvaProdotto} className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-black text-slate-700">Nome prodotto *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full rounded-2xl border border-slate-200 p-4 font-bold text-slate-950"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-black text-slate-700">Codice</span>
                <input
                  value={form.supplier_code}
                  onChange={(e) => setForm({ ...form, supplier_code: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 p-4 font-bold text-slate-950"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-black text-slate-700">Prezzo</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 p-4 font-bold text-slate-950"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-black text-slate-700">Categoria</span>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 p-4 font-bold text-slate-950"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-black text-slate-700">Unità di misura</span>
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 p-4 font-bold text-slate-950"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-5 w-5"
                />
                <span className="font-black text-slate-700">Prodotto attivo</span>
              </label>

              <div className="mt-2 flex flex-wrap justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setEditorAperto(false)}
                  className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white disabled:bg-slate-400"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Salvataggio..." : "Salva prodotto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
