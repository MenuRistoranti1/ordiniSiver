"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  Home,
  MessageCircle,
  Package,
  RefreshCw,
  Send,
  ShoppingCart,
  TrendingUp,
  Warehouse,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"

type TopItem = {
  nome: string
  quantita: number
}

export default function Dashboard() {
  const { showToast } = useToast()

  const [localeNome, setLocaleNome] = useState("")
  const [localeId, setLocaleId] = useState("")

  const [giacenzeOk, setGiacenzeOk] = useState(false)
  const [messaggiNonLetti, setMessaggiNonLetti] = useState(0)
  const [topOrdinati, setTopOrdinati] = useState<TopItem[]>([])
  const [topRotti, setTopRotti] = useState<TopItem[]>([])
  const [totaleOrdini, setTotaleOrdini] = useState(0)
  const [totaleRotture, setTotaleRotture] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    inizializzaDashboard()
  }, [])

  async function inizializzaDashboard() {
    setLoading(true)

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      window.location.href = "/"
      return
    }

    const ruolo = user.app_metadata?.role

    if (ruolo !== "locale") {
      await supabase.auth.signOut()
      window.location.href = "/"
      return
    }

    const id = String(user.app_metadata?.locale_id || "")
    const nome = String(user.app_metadata?.locale_nome || "")

    if (!id || !nome) {
      await supabase.auth.signOut()
      window.location.href = "/"
      return
    }

    setLocaleId(id)
    setLocaleNome(nome)

    await caricaTutto(id, false)

    setLoading(false)
  }

  async function caricaNomeLocale(id: string) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", id)
      .single()

    if (error) {
      console.log(error)
      setLocaleNome("Locale")
      return
    }

    setLocaleNome(data?.name || "Locale")
  }

  function getInizioSettimanaIso() {
    const oggi = new Date()
    const giorno = oggi.getDay()
    const diff = giorno === 0 ? -6 : 1 - giorno
    const lunedi = new Date(oggi)

    lunedi.setDate(oggi.getDate() + diff)
    lunedi.setHours(0, 0, 0, 0)

    return lunedi.toISOString().split("T")[0]
  }

  async function controllaGiacenze(id: string) {
    const dataISO = getInizioSettimanaIso()

    const { data } = await supabase
      .from("giacenze_settimana")
      .select("id")
      .eq("locale_id", id)
      .gte("data_inserimento", dataISO)

    setGiacenzeOk((data || []).length > 0)
  }

  async function caricaMessaggiNonLetti(id: string) {
    const { data } = await supabase
      .from("messages")
      .select("id")
      .eq("locale_id", id)
      .eq("sender", "admin")
      .eq("is_read", false)

    setMessaggiNonLetti((data || []).length)
  }

  async function caricaStatisticheLocale(id: string) {
    const oggi = new Date()
    const primoMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
      .toISOString()
      .split("T")[0]

    const oggiIso = oggi.toISOString().split("T")[0]

    const { data: ordiniData } = await supabase
      .from("ordini")
      .select("*")
      .eq("locale_id", id)
      .gte("settimana_key", primoMese)
      .lte("settimana_key", oggiIso)

    setTotaleOrdini((ordiniData || []).length)

    const ordinati: Record<string, TopItem> = {}

    ;(ordiniData || []).forEach((ordine: any) => {
      const nome = ordine.nome_prodotto || "Prodotto"

      if (!ordinati[nome]) {
        ordinati[nome] = {
          nome,
          quantita: 0,
        }
      }

      ordinati[nome].quantita += Number(ordine.quantita || 0)
    })

    setTopOrdinati(
      Object.values(ordinati)
        .sort((a, b) => b.quantita - a.quantita)
        .slice(0, 5)
    )

    const { data: giacenzeData } = await supabase
      .from("giacenze_settimana")
      .select("*")
      .eq("locale_id", id)
      .order("created_at", { ascending: true })

    if (!giacenzeData || giacenzeData.length < 2) {
      setTopRotti([])
      setTotaleRotture(0)
      return
    }

    const primaData = giacenzeData[0].created_at?.split("T")[0]
    const ultimaData =
      giacenzeData[giacenzeData.length - 1].created_at?.split("T")[0]

    const primaGiacenza = giacenzeData.filter(
      (g: any) => g.created_at?.split("T")[0] === primaData
    )

    const ultimaGiacenza = giacenzeData.filter(
      (g: any) => g.created_at?.split("T")[0] === ultimaData
    )

    const rotti: Record<string, TopItem> = {}

    ultimaGiacenza.forEach((ultima: any) => {
      const prima = primaGiacenza.find(
        (p: any) => p.nome_prodotto === ultima.nome_prodotto
      )

      if (!prima) return

      const consegnatoTotale = (ordiniData || [])
        .filter((o: any) => o.nome_prodotto === ultima.nome_prodotto)
        .reduce(
          (sum: number, o: any) => sum + Number(o.quantita_consegnata || 0),
          0
        )

      const totaleRotto =
        Number(prima.quantita || 0) +
        consegnatoTotale -
        Number(ultima.quantita || 0)

      if (totaleRotto > 0) {
        rotti[ultima.nome_prodotto] = {
          nome: ultima.nome_prodotto,
          quantita: totaleRotto,
        }
      }
    })

    const rottiArray = Object.values(rotti)
      .sort((a, b) => b.quantita - a.quantita)
      .slice(0, 5)

    setTopRotti(rottiArray)
    setTotaleRotture(rottiArray.reduce((sum, item) => sum + item.quantita, 0))
  }

  async function caricaTutto(id: string, mostraMessaggio = true) {
    if (!id) return

    setLoading(true)

    await Promise.all([
      caricaNomeLocale(id),
      controllaGiacenze(id),
      caricaMessaggiNonLetti(id),
      caricaStatisticheLocale(id),
    ])

    setLoading(false)

    if (mostraMessaggio) {
      showToast("Dashboard aggiornata", "success")
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("locale_id")
    localStorage.removeItem("locale_nome")
    localStorage.removeItem("restaurant_name")
    window.location.href = "/"
  }

  function vai(percorso: string) {
    window.location.href = percorso
  }

  function vaiNuovoOrdine() {
    if (giacenzeOk) {
      vai("/nuovo-ordine")
      return
    }

    showToast("Prima devi compilare le giacenze della settimana", "warning")
  }

  const statoOperativo = useMemo(() => {
    if (!giacenzeOk) {
      return {
        titolo: "Giacenze da completare",
        testo: "Il nuovo ordine è bloccato finché non vengono inserite le giacenze settimanali.",
        classe: "border-amber-300 bg-amber-50 text-amber-900",
        icona: AlertTriangle,
      }
    }

    if (totaleRotture > 0) {
      return {
        titolo: "Controllare dispersioni",
        testo: "Sono presenti possibili rotture o dispersioni da verificare.",
        classe: "border-red-300 bg-red-50 text-red-900",
        icona: AlertTriangle,
      }
    }

    return {
      titolo: "Operatività regolare",
      testo: "Giacenze presenti e nessuna dispersione rilevante nei dati calcolati.",
      classe: "border-green-300 bg-green-50 text-green-900",
      icona: CheckCircle2,
    }
  }, [giacenzeOk, totaleRotture])

  const StatoIcon = statoOperativo.icona

  function SidebarButton({
    label,
    active,
    onClick,
    icon: Icon,
    badge,
  }: {
    label: string
    active?: boolean
    onClick: () => void
    icon: any
    badge?: number
  }) {
    return (
      <button
        onClick={onClick}
        className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
          active
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
            : "text-slate-200 hover:translate-x-1 hover:bg-slate-800"
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          {label}
        </span>

        {!!badge && badge > 0 && (
          <span className="animate-pulse rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
            {badge}
          </span>
        )}
      </button>
    )
  }

  function KpiCard({
    label,
    value,
    note,
    icon: Icon,
    color,
  }: {
    label: string
    value: string | number
    note: string
    icon: any
    color: string
  }) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              {value}
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500">{note}</p>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    )
  }

  function TopList({
    title,
    subtitle,
    items,
    empty,
    danger,
  }: {
    title: string
    subtitle: string
    items: TopItem[]
    empty: string
    danger?: boolean
  }) {
    return (
      <section
        className={`min-w-0 rounded-3xl border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
          danger && items.length > 0
            ? "border-red-300 shadow-red-100"
            : "border-slate-200 shadow-slate-200"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              className={`text-lg font-black sm:text-xl ${
                danger ? "text-red-800" : "text-slate-950"
              }`}
            >
              {title}
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>
          </div>

          {danger && items.length > 0 && (
            <span className="animate-pulse rounded-full bg-red-700 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
              Alert
            </span>
          )}
        </div>

        {items.length === 0 && (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
            {empty}
          </div>
        )}

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.nome}-${index}`}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                danger
                  ? "border-red-100 bg-red-50"
                  : "border-slate-100 bg-slate-50 hover:bg-blue-50"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">
                  #{index + 1} — {item.nome}
                </p>
                <p className="text-xs font-bold text-slate-500">
                  {danger ? "Dispersione calcolata" : "Totale ordinato"}
                </p>
              </div>

              <div
                className={`shrink-0 rounded-2xl px-3 py-2 text-xl font-black ${
                  danger
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {item.quantita}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100">
      <div className="flex min-h-screen w-full">
        <aside className="fixed left-0 top-0 hidden h-screen w-72 shrink-0 flex-col bg-slate-950 p-5 text-white lg:flex">
          <div className="mb-6 rounded-3xl bg-slate-900 p-4">
            <h1 className="text-2xl font-black tracking-tight">OrdiniSiver</h1>
            <p className="mt-1 text-xs font-bold text-slate-300">
              Area Locale
            </p>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
            <SidebarButton
              label="Dashboard"
              active
              icon={Home}
              onClick={() => vai("/dashboard")}
            />

            <SidebarButton
              label="Giacenze settimana"
              icon={Warehouse}
              onClick={() => vai("/giacenze")}
            />

            <SidebarButton
              label="Nuovo ordine"
              icon={Send}
              onClick={vaiNuovoOrdine}
            />

            <SidebarButton
              label="Storico giacenze"
              icon={Package}
              onClick={() => vai("/storico-giacenze")}
            />

            <SidebarButton
              label="Storico ordini"
              icon={ClipboardList}
              onClick={() => vai("/storico-ordini")}
            />

            <SidebarButton
              label="Messaggi admin"
              icon={MessageCircle}
              onClick={() => vai("/messaggi")}
              badge={messaggiNonLetti}
            />
          </nav>

          <div className="space-y-2">
            <button
              onClick={logout}
              className="w-full rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white transition-all duration-200 hover:bg-red-600 active:scale-[0.98]"
            >
              Logout
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-3 py-4 sm:px-5 lg:ml-72 lg:px-6 xl:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-4">
            <LocaleMobileHeader unreadCount={messaggiNonLetti} />

            <header className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                    Dashboard locale
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
                    {localeNome || "Caricamento..."}
                  </h1>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Stato ordini, giacenze, messaggi e dispersioni
                  </p>
                </div>

                <button
                  onClick={() => caricaTutto(localeId)}
                  disabled={loading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition-all duration-200 hover:bg-blue-700 disabled:bg-slate-400"
                >
                  <RefreshCw
                    className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                  />
                  {loading ? "Aggiorno..." : "Aggiorna"}
                </button>
              </div>
            </header>

            <section
              className={`rounded-3xl border p-4 shadow-sm ${statoOperativo.classe}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/70 p-2">
                    <StatoIcon className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black">
                      {statoOperativo.titolo}
                    </h2>
                    <p className="mt-1 text-sm font-bold">
                      {statoOperativo.testo}
                    </p>
                  </div>
                </div>

                {!giacenzeOk && (
                  <button
                    onClick={() => vai("/giacenze")}
                    className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-black text-white"
                  >
                    Compila giacenze
                  </button>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Stato giacenze"
                value={giacenzeOk ? "Fatte" : "Da fare"}
                note={giacenzeOk ? "Ordine disponibile" : "Ordine bloccato"}
                icon={giacenzeOk ? CheckCircle2 : AlertTriangle}
                color={
                  giacenzeOk
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }
              />

              <KpiCard
                label="Ordini periodo"
                value={totaleOrdini}
                note="Righe ordine del mese"
                icon={ShoppingCart}
                color="bg-blue-100 text-blue-700"
              />

              <KpiCard
                label="Messaggi"
                value={messaggiNonLetti}
                note="Non letti admin"
                icon={Bell}
                color={
                  messaggiNonLetti > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-700"
                }
              />

              <KpiCard
                label="Dispersioni"
                value={totaleRotture}
                note="Totale top dispersioni"
                icon={TrendingUp}
                color={
                  totaleRotture > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <TopList
                title="Top prodotti più ordinati"
                subtitle="I 5 prodotti più richiesti nel mese corrente"
                items={topOrdinati}
                empty="Nessun ordine trovato nel periodo."
              />

              <TopList
                title="Prodotti con possibile dispersione"
                subtitle="Formula: prima giacenza + consegnato - ultima giacenza"
                items={topRotti}
                empty="Servono almeno due giacenze e consegne registrate."
                danger
              />
            </div>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <button
                onClick={() => vai("/giacenze")}
                className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:shadow-xl"
              >
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Step 1
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Giacenze settimana
                </h2>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  Inserisci o controlla le giacenze obbligatorie settimanali.
                </p>
              </button>

              <button
                onClick={vaiNuovoOrdine}
                className={`rounded-3xl border p-5 text-left shadow-sm transition-all duration-300 ${
                  giacenzeOk
                    ? "border-slate-200 bg-white hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:shadow-xl"
                    : "cursor-not-allowed border-slate-300 bg-slate-200"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  {giacenzeOk ? "Step 2" : "Bloccato"}
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  {giacenzeOk ? "Nuovo ordine" : "Nuovo ordine bloccato"}
                </h2>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  {giacenzeOk
                    ? "Compila e invia l'ordine della settimana."
                    : "Devi prima completare le giacenze."}
                </p>
              </button>

              <button
                onClick={() => vai("/storico-giacenze")}
                className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:shadow-xl"
              >
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Archivio
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Storico giacenze
                </h2>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  Consulta le giacenze già inviate.
                </p>
              </button>

              <button
                onClick={() => vai("/storico-ordini")}
                className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:shadow-xl"
              >
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Archivio
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Storico ordini
                </h2>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  Consulta gli ordini già inviati.
                </p>
              </button>

              <button
                onClick={() => vai("/messaggi")}
                className="rounded-3xl bg-blue-700 p-5 text-left text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-500/20 xl:col-span-2"
              >
                <p className="text-xs font-black uppercase tracking-wide text-blue-100">
                  Comunicazioni
                </p>
                <h2 className="mt-2 text-xl font-black">Messaggi con admin</h2>
                <p className="mt-2 text-sm font-bold text-blue-100">
                  Scrivi segnalazioni, richieste o comunicazioni
                  all'amministrazione.
                </p>
              </button>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}