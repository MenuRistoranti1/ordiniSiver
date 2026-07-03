"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Home,
  Package,
  Search,
  ShoppingCart,
  UserRound,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"

type GruppoOrdine = {
  id: string
  settimana: string
  responsabile: string
  responsabileLabel: string
  created_at?: string | null
  prodotti: any[]
}

export default function StoricoOrdini() {
  const { showToast } = useToast()

  const [ordini, setOrdini] = useState<any[]>([])
  const [localeNome, setLocaleNome] = useState("")
  const [utenteNome, setUtenteNome] = useState("")
  const [loading, setLoading] = useState(true)
  const [ricerca, setRicerca] = useState("")
  const [gruppoAperto, setGruppoAperto] = useState<string | null>(null)
  const [ordinamento, setOrdinamento] = useState("data")

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

    const localeId = String(user.app_metadata?.locale_id || "")
    const nome = String(user.app_metadata?.locale_nome || "")
    const nomeOperatore = ricavaNomeUtente(user)

    if (!localeId || !nome) {
      await supabase.auth.signOut()
      window.location.href = "/"
      return
    }

    setLocaleNome(nome)
    setUtenteNome(nomeOperatore)
    await caricaOrdini(localeId)
    setLoading(false)
  }

  function ricavaNomeUtente(user: any) {
    const valoreDiretto = String(
      user.app_metadata?.full_name ||
        user.app_metadata?.name ||
        user.app_metadata?.display_name ||
        user.app_metadata?.nome ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.nome ||
        ""
    ).trim()

    if (valoreDiretto && !valoreDiretto.includes("@")) return valoreDiretto

    const email = String(user.email || "").trim()
    return nomeDaEmail(email)
  }

  function nomeDaEmail(valore: string) {
    const email = String(valore || "").trim()
    const parteLocale = email.includes("@") ? email.split("@")[0] : email

    if (!parteLocale) return "Operatore"

    const pulito = parteLocale
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    if (!pulito) return "Operatore"

    return pulito
      .split(" ")
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(" ")
  }

  function nomeResponsabile(valore?: string | null) {
    const testo = String(valore || "").trim()

    if (!testo) return utenteNome || "Operatore"

    if (testo.includes("@local.siver.internal")) {
      return utenteNome || nomeDaEmail(testo)
    }

    if (testo.includes("@")) {
      return utenteNome || nomeDaEmail(testo)
    }

    return testo
  }

  async function caricaOrdini(localeId: string) {
    const { data, error } = await supabase
      .from("ordini")
      .select("*")
      .eq("locale_id", localeId)
      .order("created_at", { ascending: false })

    if (error) {
      console.log("Errore storico ordini:", error)
      showToast("Errore caricamento storico ordini", "error")
      return
    }

    setOrdini(data || [])
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  function vai(percorso: string) {
    window.location.href = percorso
  }

  function totaleGruppo(gruppo: GruppoOrdine) {
    return gruppo.prodotti.reduce(
      (sum: number, ordine: any) => sum + Number(ordine.quantita || 0),
      0
    )
  }

  function dataIt(data?: string | null) {
    if (!data || data === "-") return "-"

    const d = new Date(data)

    if (Number.isNaN(d.getTime())) return data

    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const gruppi = useMemo(() => {
    const gruppati = Object.values(
      ordini.reduce((acc: any, ordine: any) => {
        const settimana =
          ordine.settimana_key || ordine.created_at?.split("T")[0] || "-"

        const responsabile = ordine.responsabile || ""
        const responsabileLabel = nomeResponsabile(responsabile)
        const chiave = `${settimana}-${responsabileLabel}`

        if (!acc[chiave]) {
          acc[chiave] = {
            id: chiave,
            settimana,
            responsabile,
            responsabileLabel,
            created_at: ordine.created_at,
            prodotti: [],
          }
        }

        acc[chiave].prodotti.push(ordine)
        return acc
      }, {})
    ) as GruppoOrdine[]

    return gruppati.sort((a, b) => {
      if (ordinamento === "prodotti") {
        return b.prodotti.length - a.prodotti.length
      }

      if (ordinamento === "quantita") {
        return totaleGruppo(b) - totaleGruppo(a)
      }

      return String(b.settimana).localeCompare(String(a.settimana))
    })
  }, [ordini, ordinamento, utenteNome])

  const gruppiFiltrati = useMemo(() => {
    const q = ricerca.toLowerCase().trim()

    if (!q) return gruppi

    return gruppi
      .map((gruppo: GruppoOrdine) => {
        const testoGruppo = `${gruppo.settimana} ${gruppo.responsabileLabel}`.toLowerCase()

        const prodottiFiltrati = gruppo.prodotti.filter((ordine: any) =>
          [
            ordine.nome_prodotto,
            ordine.settimana_key,
            ordine.misure,
            ordine.locale_nome,
            gruppo.responsabileLabel,
          ]
            .filter(Boolean)
            .some((valore) => String(valore).toLowerCase().includes(q))
        )

        if (testoGruppo.includes(q)) return gruppo

        return {
          ...gruppo,
          prodotti: prodottiFiltrati,
        }
      })
      .filter((gruppo: GruppoOrdine) => gruppo.prodotti.length > 0)
  }, [gruppi, ricerca])

  const totaleQuantita = useMemo(() => {
    return ordini.reduce((sum, ordine) => sum + Number(ordine.quantita || 0), 0)
  }, [ordini])

  function StatCard({
    label,
    value,
    icon: Icon,
    note,
  }: {
    label: string
    value: number | string
    icon: any
    note: string
  }) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{note}</p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <LocaleMobileHeader />

        <header className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                Archivio locale
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Storico ordini
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {localeNome || "Caricamento..."} · Ordini inviati e prodotti ordinati
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => vai("/dashboard")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white"
              >
                <Home className="h-4 w-4" />
                Home
              </button>

              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Indietro
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Ordini inviati"
            value={gruppiFiltrati.length}
            icon={ClipboardList}
            note="Gruppi settimanali"
          />

          <StatCard
            label="Prodotti ordinati"
            value={ordini.length}
            icon={ShoppingCart}
            note="Righe prodotto"
          />

          <StatCard
            label="Quantità totale"
            value={totaleQuantita}
            icon={Package}
            note="Pezzi complessivi"
          />
        </section>

        <section className="grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca prodotto, settimana o misura..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="h-14 w-full rounded-2xl border-2 border-slate-300 bg-white pl-12 pr-4 text-base font-bold text-slate-950 placeholder:text-slate-500 shadow-sm outline-none focus:border-blue-600"
            />
          </div>

          <select
            value={ordinamento}
            onChange={(e) => setOrdinamento(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-950 shadow-sm outline-none focus:border-blue-600"
          >
            <option value="data">Ordina per settimana</option>
            <option value="prodotti">Ordina per numero prodotti</option>
            <option value="quantita">Ordina per quantità totale</option>
          </select>
        </section>

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-black text-slate-500 shadow-sm">
            Caricamento storico ordini...
          </section>
        ) : (
          <section className="space-y-3">
            {gruppiFiltrati.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-black text-slate-600">
                  Nessun ordine trovato.
                </p>
              </div>
            )}

            {gruppiFiltrati.map((gruppo: GruppoOrdine) => {
              const aperto = gruppoAperto === gruppo.id
              const totale = totaleGruppo(gruppo)

              return (
                <article
                  key={gruppo.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <button
                      type="button"
                      onClick={() => setGruppoAperto(aperto ? null : gruppo.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">
                          <CalendarDays className="h-4 w-4" />
                          {dataIt(gruppo.settimana)}
                        </span>

                        <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                          <UserRound className="h-4 w-4" />
                          {gruppo.responsabileLabel}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <span className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-800">
                          {gruppo.prodotti.length} prodotti
                        </span>

                        <span className="rounded-2xl bg-green-50 px-3 py-2 text-sm font-black text-green-700">
                          {totale} pezzi
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGruppoAperto(aperto ? null : gruppo.id)}
                      className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
                    >
                      {aperto ? "Chiudi" : "Apri"}
                    </button>
                  </div>

                  {aperto && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                      <div className="space-y-3">
                        {gruppo.prodotti.map((ordine: any, index: number) => (
                          <div
                            key={ordine.id || `${gruppo.id}-${index}`}
                            className={`rounded-2xl border border-slate-200 p-4 ${
                              index % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-base font-black text-slate-950">
                                  {ordine.nome_prodotto}
                                </h4>
                                <p className="mt-1 text-xs font-bold text-slate-500">
                                  {ordine.created_at
                                    ? new Date(ordine.created_at).toLocaleString("it-IT")
                                    : "-"}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 sm:flex">
                                <div className="rounded-2xl bg-blue-50 px-4 py-2 text-center">
                                  <p className="text-[10px] font-black uppercase text-blue-500">
                                    Quantità
                                  </p>
                                  <p className="text-xl font-black text-blue-800">
                                    {ordine.quantita}
                                  </p>
                                </div>

                                <div className="rounded-2xl bg-slate-100 px-4 py-2 text-center">
                                  <p className="text-[10px] font-black uppercase text-slate-500">
                                    Unità
                                  </p>
                                  <p className="text-xl font-black text-slate-800">
                                    {ordine.misure || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}