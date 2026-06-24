"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  FileText,
  Grid3X3,
  History,
  Home,
  LogOut,
  MessageCircle,
  Package,
  Pencil,
  RotateCcw,
  Save,
  ShoppingCart,
  Truck,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Store,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type MenuId =
  | "dashboard"
  | "prodotti"
  | "entra-locale"
  | "riepilogo-ordini"
  | "ordini-locale"
  | "storico-ordini"
  | "storico-giacenze"
  | "storico-consegne"
  | "storico-fatture"
  | "consegne"
  | "soglie"
  | "messaggi"
  | "cancellazioni"
  | "statistiche"
  | "alert"
  | "estrazioni"

type MenuItem = {
  id: MenuId
  label: string
  href?: string
  icon: typeof Home
}

type Locale = {
  id: string | number
  name: string
}

const STORAGE_KEY = "ordini_siver_admin_menu_order"

const MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin-dashboard", icon: Home },
  { id: "prodotti", label: "Anagrafica prodotti", href: "/admin-prodotti", icon: Package },
  { id: "entra-locale", label: "Entra come locale", icon: Store },
  { id: "riepilogo-ordini", label: "Riepilogo ordini", href: "/admin-ordini", icon: ShoppingCart },
  { id: "ordini-locale", label: "Ordini per locale", href: "/admin-ordini", icon: Boxes },
  { id: "storico-ordini", label: "Storico ordini", href: "/admin-storico-ordini", icon: History },
  { id: "storico-giacenze", label: "Storico giacenze", href: "/storico-giacenze", icon: Package },
  { id: "storico-consegne", label: "Storico consegne", href: "/admin-storico-consegne", icon: Truck },
  { id: "storico-fatture", label: "Storico fatture", href: "/admin-storico-fatture", icon: FileText },
  { id: "consegne", label: "Consegne", href: "/admin-consegne", icon: Truck },
  { id: "soglie", label: "Soglie giacenze", href: "/admin-soglie-giacenze", icon: Boxes },
  { id: "messaggi", label: "Messaggi", href: "/admin-messaggi", icon: MessageCircle },
  { id: "cancellazioni", label: "Cancellazioni", href: "/admin-cancellazioni", icon: Trash2 },
  { id: "statistiche", label: "Statistiche", href: "/admin-statistiche", icon: BarChart3 },
  { id: "alert", label: "Alert", href: "/admin-alert", icon: AlertTriangle },
  { id: "estrazioni", label: "Estrazioni prodotti", href: "/admin-estrazioni", icon: BarChart3 },
]

const ORDINE_INIZIALE = MENU_ITEMS.map((item) => item.id)

function normalizzaOrdine(valore: unknown): MenuId[] {
  const valori = Array.isArray(valore) ? valore : []
  const validi = valori.filter((id): id is MenuId =>
    ORDINE_INIZIALE.includes(id as MenuId)
  )
  const unici = Array.from(new Set(validi))
  return [...unici, ...ORDINE_INIZIALE.filter((id) => !unici.includes(id))]
}

export default function AdminAppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement | null>(null)

  const [menuAperto, setMenuAperto] = useState(false)
  const [modifica, setModifica] = useState(false)
  const [ordine, setOrdine] = useState<MenuId[]>(ORDINE_INIZIALE)
  const [ordineSalvato, setOrdineSalvato] = useState<MenuId[]>(ORDINE_INIZIALE)
  const [trascinato, setTrascinato] = useState<MenuId | null>(null)
  const [messaggio, setMessaggio] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [sceltaLocale, setSceltaLocale] = useState(false)
  const [locali, setLocali] = useState<Locale[]>([])
  const [caricamentoLocali, setCaricamentoLocali] = useState(false)

  useEffect(() => {
    let attivo = true

    async function caricaPreferenze() {
      const locale = window.localStorage.getItem(STORAGE_KEY)
      let ordineLocale = ORDINE_INIZIALE

      if (locale) {
        try {
          ordineLocale = normalizzaOrdine(JSON.parse(locale))
        } catch {
          ordineLocale = ORDINE_INIZIALE
        }
      }

      if (attivo) {
        setOrdine(ordineLocale)
        setOrdineSalvato(ordineLocale)
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!attivo || !user) return
      setUserId(user.id)

      const { data, error } = await supabase
        .from("admin_menu_preferences")
        .select("item_order")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!error && data?.item_order) {
        const ordineDatabase = normalizzaOrdine(data.item_order)
        setOrdine(ordineDatabase)
        setOrdineSalvato(ordineDatabase)
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ordineDatabase))
      }
    }

    caricaPreferenze()

    return () => {
      attivo = false
    }
  }, [])

  useEffect(() => {
    function chiudiFuori(event: MouseEvent) {
      if (
        menuAperto &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setMenuAperto(false)
        setModifica(false)
        setOrdine(ordineSalvato)
        setSceltaLocale(false)
      }
    }

    document.addEventListener("mousedown", chiudiFuori)
    return () => document.removeEventListener("mousedown", chiudiFuori)
  }, [menuAperto, ordineSalvato])

  const itemsOrdinati = useMemo(
    () =>
      ordine
        .map((id) => MENU_ITEMS.find((item) => item.id === id))
        .filter((item): item is MenuItem => Boolean(item)),
    [ordine]
  )

  async function salvaOrdine() {
    const nuovoOrdine = normalizzaOrdine(ordine)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nuovoOrdine))
    setOrdine(nuovoOrdine)
    setOrdineSalvato(nuovoOrdine)
    setModifica(false)

    if (!userId) {
      setMessaggio("Disposizione salvata su questo dispositivo.")
      return
    }

    const { error } = await supabase.from("admin_menu_preferences").upsert(
      {
        user_id: userId,
        item_order: nuovoOrdine,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    setMessaggio(
      error
        ? "Salvata sul dispositivo. Esegui lo script SQL per sincronizzarla su tutti i dispositivi."
        : "Disposizione salvata."
    )
  }

  function ripristinaOrdine() {
    setOrdine(ORDINE_INIZIALE)
    setMessaggio("Ordine iniziale pronto: premi Salva.")
  }

  function sposta(id: MenuId, movimento: number) {
    const posizione = ordine.indexOf(id)
    const nuovaPosizione = posizione + movimento
    if (posizione < 0 || nuovaPosizione < 0 || nuovaPosizione >= ordine.length) return

    const copia = [...ordine]
    ;[copia[posizione], copia[nuovaPosizione]] = [
      copia[nuovaPosizione],
      copia[posizione],
    ]
    setOrdine(copia)
  }

  function rilasciaSu(destinazione: MenuId) {
    if (!trascinato || trascinato === destinazione) return

    const copia = ordine.filter((id) => id !== trascinato)
    const posizione = copia.indexOf(destinazione)
    copia.splice(posizione, 0, trascinato)
    setOrdine(copia)
    setTrascinato(null)
  }

  async function selezionaVoce(item: MenuItem) {
    if (modifica) return

    if (item.id === "entra-locale") {
      setCaricamentoLocali(true)
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .order("name")

      setCaricamentoLocali(false)

      if (error) {
        setMessaggio("Impossibile caricare i locali.")
        return
      }

      setLocali(data || [])
      setSceltaLocale(true)
      return
    }

    setMenuAperto(false)
    router.push(item.href || "/admin-dashboard")
  }

  function entraComeLocale(locale: Locale) {
    window.localStorage.setItem("locale_id", String(locale.id))
    window.localStorage.setItem("locale_nome", locale.name)
    window.localStorage.setItem("admin_mode", "true")
    setMenuAperto(false)
    router.push("/dashboard")
  }

  async function logout() {
    await supabase.auth.signOut()
    window.localStorage.removeItem("admin")
    window.localStorage.removeItem("admin_mode")
    router.replace("/admin")
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <button
            onClick={() => router.push("/admin-dashboard")}
            className="text-left"
          >
            <p className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">
              Ordini Siver
            </p>
            <p className="hidden text-xs font-bold text-slate-500 sm:block">
              Amministrazione
            </p>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/admin-dashboard")}
              title="Notifiche"
              className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 transition hover:bg-slate-50"
            >
              <Bell className="h-5 w-5" />
            </button>

            <button
              onClick={() => {
                setMenuAperto((aperto) => !aperto)
                setMessaggio("")
              }}
              title="Apri applicazioni"
              className={`rounded-2xl border p-3 transition ${
                menuAperto
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Grid3X3 className="h-5 w-5" />
            </button>

            <button
              onClick={logout}
              title="Esci"
              className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 sm:flex"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </div>
        </div>
      </header>

      {menuAperto && (
        <div className="fixed inset-0 z-50 bg-slate-950/20">
          <div
            ref={panelRef}
            className="absolute right-2 top-16 flex max-h-[calc(100vh-5rem)] w-[calc(100vw-1rem)] max-w-xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl sm:right-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Applicazioni</h2>
                <p className="text-xs font-bold text-slate-500">
                  {modifica ? "Trascina o usa le frecce per riordinare" : "Menu amministratore"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {modifica ? (
                  <>
                    <button
                      onClick={ripristinaOrdine}
                      title="Ripristina"
                      className="rounded-xl bg-slate-100 p-2.5 text-slate-700"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={salvaOrdine}
                      title="Salva disposizione"
                      className="rounded-xl bg-blue-600 p-2.5 text-white"
                    >
                      <Save className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setModifica(true)
                      setSceltaLocale(false)
                      setMessaggio("")
                    }}
                    title="Modifica disposizione"
                    className="rounded-xl bg-blue-50 p-2.5 text-blue-700"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                )}

                <button
                  onClick={() => {
                    setMenuAperto(false)
                    setModifica(false)
                    setOrdine(ordineSalvato)
                    setSceltaLocale(false)
                  }}
                  title="Chiudi"
                  className="rounded-xl bg-slate-100 p-2.5 text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {sceltaLocale ? (
              <div className="overflow-y-auto p-5">
                <button
                  onClick={() => setSceltaLocale(false)}
                  className="mb-4 text-sm font-black text-blue-700"
                >
                  ← Torna alle applicazioni
                </button>

                <h3 className="mb-3 text-base font-black text-slate-950">
                  Seleziona il locale
                </h3>

                {caricamentoLocali ? (
                  <p className="font-bold text-slate-500">Caricamento...</p>
                ) : (
                  <div className="space-y-2">
                    {locali.map((locale) => (
                      <button
                        key={locale.id}
                        onClick={() => entraComeLocale(locale)}
                        className="w-full rounded-2xl border border-slate-200 p-4 text-left font-bold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        {locale.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-y-auto px-4 pb-5 pt-4 sm:px-5">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {itemsOrdinati.map((item) => {
                    const Icon = item.icon
                    const attivo = item.href && pathname.startsWith(item.href)

                    return (
                      <div
                        key={item.id}
                        draggable={modifica}
                        onDragStart={() => setTrascinato(item.id)}
                        onDragOver={(event) => modifica && event.preventDefault()}
                        onDrop={() => modifica && rilasciaSu(item.id)}
                        className={`relative rounded-2xl ${
                          modifica ? "cursor-move ring-1 ring-slate-200" : ""
                        }`}
                      >
                        <button
                          onClick={() => selezionaVoce(item)}
                          className={`flex min-h-28 w-full flex-col items-center justify-center rounded-2xl px-2 py-3 text-center transition ${
                            attivo && !modifica
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="mb-2 h-7 w-7 stroke-[1.8]" />
                          <span className="text-[11px] font-bold leading-4 sm:text-xs">
                            {item.label}
                          </span>
                        </button>

                        {modifica && (
                          <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
                            <button
                              onClick={() => sposta(item.id, -1)}
                              className="rounded-md bg-white p-0.5 text-slate-500 shadow"
                              title="Sposta prima"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => sposta(item.id, 1)}
                              className="rounded-md bg-white p-0.5 text-slate-500 shadow"
                              title="Sposta dopo"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {messaggio && (
                  <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-700">
                    {messaggio}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
