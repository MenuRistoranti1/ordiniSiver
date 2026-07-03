"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Home,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  User,
  Warehouse,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"

type ProdottoGiacenza = {
  id: string
  nome_prodotto: string
  supplier_code: string
  min_stock: number
  max_stock: number
}

export default function Giacenze() {
  const { showToast } = useToast()

  const [prodotti, setProdotti] = useState<ProdottoGiacenza[]>([])
  const [quantita, setQuantita] = useState<Record<string, string>>({})
  const [localeId, setLocaleId] = useState("")
  const [localeNome, setLocaleNome] = useState("")
  const [operatore, setOperatore] = useState("Operatore")
  const [blocco, setBlocco] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [ultimaModifica, setUltimaModifica] = useState<string | null>(null)

  const [ricerca, setRicerca] = useState("")
  const [filtro, setFiltro] = useState("tutti")
  const [ordinamento, setOrdinamento] = useState("nome")
  const [soloDaCompilare, setSoloDaCompilare] = useState(false)

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

    await Promise.all([caricaProdotti(id), controllaBloccoGiacenze(id)])

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
      .replace(/\b\w/g, (lettera) => lettera.toUpperCase())
      .trim()
  }

  function salutoOrario() {
    const ora = new Date().getHours()

    if (ora >= 5 && ora < 13) return "Buongiorno"
    if (ora >= 13 && ora < 18) return "Buon pomeriggio"
    return "Buonasera"
  }

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

  function periodoSettimana() {
    const inizio = sabatoCorrente()
    const fine = new Date(inizio)
    fine.setDate(inizio.getDate() + 6)

    return `${inizio.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
    })} – ${fine.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`
  }

  async function caricaProdotti(id: string) {
    const { data: impostazioni, error } = await supabase
      .from("restaurant_product_settings")
      .select("id, active, min_stock, max_stock, prodotto_id, product_id")
      .eq("restaurant_id", id)
      .eq("active", true)

    if (error) {
      console.log(error)
      showToast("Errore caricamento prodotti", "error")
      return
    }

    const idsProdotti = (impostazioni || [])
      .map((item: any) => item.prodotto_id || item.product_id)
      .filter(Boolean)

    if (idsProdotti.length === 0) {
      setProdotti([])
      return
    }

    const { data: prodottiDb, error: errorProdotti } = await supabase
      .from("products")
      .select("id, name, supplier_code, active")
      .in("id", idsProdotti)
      .eq("active", true)

    if (errorProdotti) {
      console.log(errorProdotti)
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

    const prodottiFormattati = (impostazioni || [])
      .map((item: any) => {
        const idProdotto = item.prodotto_id || item.product_id
        const prodotto = prodottiPuliti.find(
          (p: any) => String(p.id) === String(idProdotto)
        )

        if (!prodotto) return null

        return {
          id: idProdotto,
          nome_prodotto: prodotto.name || "Prodotto",
          supplier_code: prodotto.supplier_code || "-",
          min_stock: Number(item.min_stock || 0),
          max_stock: Number(item.max_stock || 0),
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) =>
        String(a.nome_prodotto || "").localeCompare(
          String(b.nome_prodotto || "")
        )
      ) as ProdottoGiacenza[]

    setProdotti(prodottiFormattati)
  }

  async function controllaBloccoGiacenze(id: string) {
    const settimanaKey = getSettimanaKey()
    const prossimo = prossimoSabato().toLocaleDateString("it-IT")

    const { data } = await supabase
      .from("giacenze_settimana")
      .select("id")
      .eq("locale_id", id)
      .eq("settimana_key", settimanaKey)
      .limit(1)

    if (data && data.length > 0) {
      setBlocco(
        `Hai già inviato le giacenze di questa settimana. Potrai inserirle nuovamente da sabato ${prossimo}.`
      )
    } else {
      setBlocco("")
    }
  }

  async function aggiornaPagina() {
    if (!localeId) return

    setLoading(true)
    await Promise.all([caricaProdotti(localeId), controllaBloccoGiacenze(localeId)])
    setLoading(false)
    showToast("Giacenze aggiornate", "success")
  }

  function statoSoglia(prodotto: ProdottoGiacenza) {
    const valore = quantita[prodotto.id]

    if (valore === undefined || valore === "") return "Da compilare"

    const qta = Number(valore)
    const min = Number(prodotto.min_stock || 0)
    const max = Number(prodotto.max_stock || 0)

    if (min > 0 && qta < min) return "Sotto soglia"
    if (max > 0 && qta > max) return "Sopra soglia"

    return "Corretto"
  }

  function classeStato(stato: string) {
    if (stato === "Sotto soglia") return "border-red-200 bg-red-50 text-red-700"
    if (stato === "Sopra soglia") return "border-orange-200 bg-orange-50 text-orange-700"
    if (stato === "Corretto") return "border-green-200 bg-green-50 text-green-700"
    return "border-slate-200 bg-slate-100 text-slate-700"
  }

  function aggiornaQuantita(idProdotto: string, valore: string) {
    setQuantita((attuali) => ({
      ...attuali,
      [idProdotto]: valore,
    }))
    setUltimaModifica(idProdotto)

    window.setTimeout(() => {
      setUltimaModifica((attuale) => (attuale === idProdotto ? null : attuale))
    }, 450)
  }

  function cambiaQuantita(idProdotto: string, variazione: number) {
    const attuale = Number(quantita[idProdotto] || 0)
    const nuova = Math.max(0, attuale + variazione)

    aggiornaQuantita(idProdotto, nuova === 0 ? "" : String(nuova))
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

    if (soloDaCompilare) {
      lista = lista.filter((p) => !quantita[p.id] || Number(quantita[p.id] || 0) <= 0)
    }

    if (filtro === "compilati") {
      lista = lista.filter((p) => Number(quantita[p.id] || 0) > 0)
    } else if (filtro !== "tutti") {
      lista = lista.filter((p) => statoSoglia(p) === filtro)
    }

    if (ordinamento === "nome") {
      lista.sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto))
    }

    if (ordinamento === "codice") {
      lista.sort((a, b) =>
        (a.supplier_code || "").localeCompare(b.supplier_code || "")
      )
    }

    if (ordinamento === "min") {
      lista.sort((a, b) => Number(b.min_stock || 0) - Number(a.min_stock || 0))
    }

    if (ordinamento === "max") {
      lista.sort((a, b) => Number(b.max_stock || 0) - Number(a.max_stock || 0))
    }

    if (ordinamento === "stato") {
      const peso: Record<string, number> = {
        "Sotto soglia": 1,
        "Da compilare": 2,
        Corretto: 3,
        "Sopra soglia": 4,
      }

      lista.sort((a, b) => peso[statoSoglia(a)] - peso[statoSoglia(b)])
    }

    return lista
  }, [prodotti, ricerca, filtro, ordinamento, soloDaCompilare, quantita])

  const prodottiTotali = prodotti.length

  const prodottiCompilati = prodotti.filter(
    (p) => Number(quantita[p.id] || 0) > 0
  ).length

  const quantitaTotaleCompilata = prodotti.reduce(
    (totale, p) => totale + Number(quantita[p.id] || 0),
    0
  )

  const prodottiSottoSoglia = prodotti.filter(
    (p) => statoSoglia(p) === "Sotto soglia"
  ).length

  const percentualeCompilazione = prodottiTotali
    ? Math.round((prodottiCompilati / prodottiTotali) * 100)
    : 0

  async function salvaGiacenze() {
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

    const conferma = window.confirm(
      `Stai salvando ${prodottiCompilati} prodotti compilati per una quantità totale di ${quantitaTotaleCompilata}. Confermi?`
    )

    if (!conferma) return

    setIsSaving(true)

    const settimanaKey = getSettimanaKey()

    const righe = prodotti.map((p) => ({
      locale_id: localeId,
      locale_nome: localeNome,
      responsabile: operatore.trim() || "Operatore",
      nome_prodotto: p.nome_prodotto,
      quantita: Number(quantita[p.id] || 0),
      settimana_key: settimanaKey,
    }))

    const { error } = await supabase.from("giacenze_settimana").insert(righe)

    if (error) {
      console.log(error)
      showToast("Errore salvataggio giacenze", "error")
      setIsSaving(false)
      return
    }

    showToast("Giacenze salvate!", "success")

    setTimeout(() => {
      window.location.href = "/dashboard"
    }, 800)
  }

  function QuantitaControl({ prodotto }: { prodotto: ProdottoGiacenza }) {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => cambiaQuantita(prodotto.id, -1)}
          disabled={!!blocco || isSaving}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm transition-all hover:bg-blue-50 disabled:bg-slate-100 disabled:text-slate-300"
          aria-label={`Diminuisci quantità ${prodotto.nome_prodotto}`}
        >
          <Minus className="h-5 w-5" />
        </button>

        <input
          type="number"
          inputMode="decimal"
          value={quantita[prodotto.id] || ""}
          disabled={!!blocco || isSaving}
          onChange={(e) => aggiornaQuantita(prodotto.id, e.target.value)}
          className="h-11 w-24 rounded-xl border-2 border-slate-200 bg-white px-3 text-center text-lg font-black text-slate-950 outline-none transition-all focus:border-blue-600 disabled:bg-slate-200 disabled:text-slate-500"
          placeholder="0"
        />

        <button
          type="button"
          onClick={() => cambiaQuantita(prodotto.id, 1)}
          disabled={!!blocco || isSaving}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 disabled:bg-slate-300"
          aria-label={`Aumenta quantità ${prodotto.nome_prodotto}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    )
  }

  function KpiCard({
    label,
    value,
    note,
    icon: Icon,
    tone,
  }: {
    label: string
    value: string | number
    note: string
    icon: any
    tone: string
  }) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
            <Icon className="h-7 w-7" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p>
            <p className="text-sm font-bold text-slate-500">{note}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-32 pt-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <LocaleMobileHeader />

        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">Giacenze settimana</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {salutoOrario()} {operatore}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
                <span>{localeNome || "Locale"}</span>
                <span>·</span>
                <span>Inserisci le quantità disponibili</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[560px]">
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard")}
                disabled={isSaving}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition-all hover:bg-slate-800 disabled:bg-slate-400"
              >
                <Home className="h-5 w-5" />
                Home
              </button>

              <button
                type="button"
                onClick={aggiornaPagina}
                disabled={loading || isSaving}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition-all hover:bg-blue-700 disabled:bg-slate-400"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                Aggiorna
              </button>

              <div className="rounded-2xl bg-blue-50 p-3">
                <p className="text-[11px] font-black uppercase text-blue-600">Settimana</p>
                <p className="mt-1 text-sm font-black text-blue-900">{periodoSettimana()}</p>
              </div>
            </div>
          </div>
        </header>

        {blocco && (
          <section className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm font-black text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{blocco}</span>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Avanzamento compilazione</p>
                  <p className="mt-1 text-3xl font-black text-slate-950">{percentualeCompilazione}%</p>
                </div>
                <p className="text-sm font-black text-slate-500">
                  {prodottiCompilati} di {prodottiTotali} prodotti
                </p>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${percentualeCompilazione}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 lg:w-72">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="truncate">{operatore}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Prodotti totali"
            value={prodottiTotali}
            note="prodotti attivi"
            icon={Package}
            tone="bg-blue-100 text-blue-700"
          />
          <KpiCard
            label="Compilati"
            value={prodottiCompilati}
            note="prodotti inseriti"
            icon={ClipboardCheck}
            tone="bg-green-100 text-green-700"
          />
          <KpiCard
            label="Quantità totale"
            value={quantitaTotaleCompilata}
            note="pezzi complessivi"
            icon={Warehouse}
            tone="bg-purple-100 text-purple-700"
          />
          <KpiCard
            label="Sotto soglia"
            value={prodottiSottoSoglia}
            note="prodotti da verificare"
            icon={AlertTriangle}
            tone={prodottiSottoSoglia > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_220px_220px_170px]">
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
              <option value="tutti">Tutti i prodotti</option>
              <option value="compilati">Solo compilati</option>
              <option value="Sotto soglia">Sotto soglia</option>
              <option value="Corretto">Corretto</option>
              <option value="Sopra soglia">Sopra soglia</option>
              <option value="Da compilare">Da compilare</option>
            </select>

            <select
              value={ordinamento}
              onChange={(e) => setOrdinamento(e.target.value)}
              className="h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-bold text-slate-950 outline-none focus:border-blue-600"
            >
              <option value="nome">Ordina per nome</option>
              <option value="codice">Ordina per codice</option>
              <option value="min">Ordina per minimo</option>
              <option value="max">Ordina per massimo</option>
              <option value="stato">Ordina per stato</option>
            </select>

            <button
              type="button"
              onClick={() => setSoloDaCompilare(!soloDaCompilare)}
              className={`inline-flex h-14 items-center justify-center rounded-2xl border-2 px-4 text-sm font-black transition-all ${
                soloDaCompilare
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-100 bg-blue-50 text-blue-700"
              }`}
            >
              {soloDaCompilare ? "Solo da compilare attivo" : "Solo da compilare"}
            </button>

            <button
              type="button"
              onClick={aggiornaPagina}
              disabled={loading || isSaving}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:bg-slate-400"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm font-black text-slate-500">
              Caricamento prodotti...
            </div>
          ) : (
            <>
              <div className="hidden bg-slate-950 text-[11px] font-black uppercase tracking-wide text-white md:grid md:grid-cols-[1.2fr_150px_160px_160px_230px]">
                <div className="px-4 py-3">Prodotto</div>
                <div className="px-4 py-3 text-center">Attuale</div>
                <div className="px-4 py-3 text-center">Range</div>
                <div className="px-4 py-3 text-center">Stato</div>
                <div className="px-4 py-3 text-right">Giacenza</div>
              </div>

              <div className="hidden md:block">
                {prodottiFiltrati.map((prodotto, index) => {
                  const stato = statoSoglia(prodotto)
                  const valore = quantita[prodotto.id]
                  const modificata = ultimaModifica === prodotto.id

                  return (
                    <div
                      key={`${prodotto.id}-${index}`}
                      className={`grid grid-cols-[1.2fr_150px_160px_160px_230px] items-center border-b border-slate-100 transition-all duration-300 last:border-b-0 ${
                        modificata
                          ? "bg-blue-50"
                          : index % 2 === 0
                            ? "bg-white"
                            : "bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0 px-4 py-3">
                        <p className="text-xs font-black text-slate-500">{prodotto.supplier_code || "-"}</p>
                        <h3 className="mt-1 truncate text-base font-black text-slate-950">{prodotto.nome_prodotto}</h3>
                      </div>

                      <div className="px-4 py-3 text-center">
                        <p className="text-xl font-black text-slate-950">{valore || "—"}</p>
                        <p className="text-xs font-bold text-slate-500">{valore ? "inserita" : "da compilare"}</p>
                      </div>

                      <div className="px-4 py-3 text-center text-base font-black text-slate-600">
                        {prodotto.min_stock} / {prodotto.max_stock}
                      </div>

                      <div className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase ${classeStato(stato)}`}>
                          {stato}
                        </span>
                      </div>

                      <div className="px-4 py-3">
                        <QuantitaControl prodotto={prodotto} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {prodottiFiltrati.map((prodotto, index) => {
                  const stato = statoSoglia(prodotto)
                  const modificata = ultimaModifica === prodotto.id

                  return (
                    <div
                      key={`${prodotto.id}-${index}`}
                      className={`rounded-2xl border p-3 shadow-sm transition-all duration-300 ${
                        modificata ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-slate-500">{prodotto.supplier_code || "-"}</p>
                          <h3 className="mt-1 text-sm font-black leading-tight text-slate-950">{prodotto.nome_prodotto}</h3>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">
                              Range: {prodotto.min_stock}/{prodotto.max_stock}
                            </span>
                            <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase ${classeStato(stato)}`}>
                              {stato}
                            </span>
                          </div>
                        </div>

                        <QuantitaControl prodotto={prodotto} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {prodottiFiltrati.length === 0 && (
                <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                  Nessun prodotto trovato.
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-8">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-400">Prodotti compilati</p>
              <p className="text-xl font-black">{prodottiCompilati} / {prodottiTotali}</p>
            </div>

            <div>
              <p className="text-[11px] font-black uppercase text-slate-400">Quantità totale</p>
              <p className="text-xl font-black">{quantitaTotaleCompilata} pezzi</p>
            </div>
          </div>

          <button
            onClick={salvaGiacenze}
            disabled={!!blocco || isSaving || loading}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 text-base font-black text-white transition-all hover:bg-blue-700 disabled:bg-slate-500"
          >
            {isSaving ? (
              "Salvataggio..."
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Salva giacenze
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}