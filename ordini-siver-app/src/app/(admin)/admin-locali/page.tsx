"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Building2,
  Edit,
  Mail,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type LocaleRow = {
  id: string
  name: string
  email?: string | null
  invoice_alias?: string | null
  active?: boolean | null
}

type UtenteLocale = {
  id: string
  nome: string | null
  cognome: string | null
  utente: string | null
  email_interna: string | null
  locale_id: string | null
  locale_nome: string | null
  active: boolean | null
  last_login?: string | null
}

type LocaleForm = {
  id: string
  name: string
  email: string
  invoice_alias: string
}

export default function AdminLocaliPage() {
  const [locali, setLocali] = useState<LocaleRow[]>([])
  const [utenti, setUtenti] = useState<UtenteLocale[]>([])
  const [ordini, setOrdini] = useState<any[]>([])
  const [giacenze, setGiacenze] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState("")
  const [messaggio, setMessaggio] = useState("")
  const [ricerca, setRicerca] = useState("")

  const [localeAperto, setLocaleAperto] = useState<LocaleRow | null>(null)
  const [form, setForm] = useState<LocaleForm>({
    id: "",
    name: "",
    email: "",
    invoice_alias: "",
  })

  useEffect(() => {
    caricaDati()
  }, [])

  async function caricaDati() {
    setLoading(true)
    setErrore("")
    setMessaggio("")

    try {
      const [localiRes, utentiRes, ordiniRes, giacenzeRes] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id, name, email, invoice_alias, active")
          .order("name", { ascending: true }),
        supabase
          .from("local_users")
          .select("id, nome, cognome, utente, email_interna, locale_id, locale_nome, active, last_login")
          .order("nome", { ascending: true }),
        supabase
          .from("ordini")
          .select("id, locale_id, locale_nome, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("giacenze_settimana")
          .select("id, locale_id, locale_nome, created_at")
          .order("created_at", { ascending: false }),
      ])

      if (localiRes.error) throw localiRes.error
      if (utentiRes.error) throw utentiRes.error
      if (ordiniRes.error) throw ordiniRes.error
      if (giacenzeRes.error) throw giacenzeRes.error

      setLocali((localiRes.data || []) as LocaleRow[])
      setUtenti((utentiRes.data || []) as UtenteLocale[])
      setOrdini(ordiniRes.data || [])
      setGiacenze(giacenzeRes.data || [])
    } catch (error: any) {
      setErrore(error?.message || "Errore caricamento locali")
    }

    setLoading(false)
  }

  function apriModifica(locale: LocaleRow) {
    setLocaleAperto(locale)
    setForm({
      id: locale.id,
      name: locale.name || "",
      email: locale.email || "",
      invoice_alias: locale.invoice_alias || "",
    })
    setErrore("")
    setMessaggio("")
  }

  async function salvaLocale() {
    if (!form.id || !form.name.trim()) {
      setErrore("Il nome del locale è obbligatorio.")
      return
    }

    const localePrecedente = locali.find((l) => String(l.id) === String(form.id))
    const vecchioNome = localePrecedente?.name || ""
    const nuovoNome = form.name.trim()

    const conferma = window.confirm(
      vecchioNome && vecchioNome !== nuovoNome
        ? `Confermi la modifica da "${vecchioNome}" a "${nuovoNome}"?\n\nAggiornerò anche ordini, giacenze, messaggi, alert e fatture col nuovo nome.`
        : "Confermi il salvataggio del locale?"
    )

    if (!conferma) return

    setSaving(true)
    setErrore("")
    setMessaggio("")

    try {
      const { error: localeError } = await supabase
        .from("restaurants")
        .update({
          name: nuovoNome,
          email: form.email.trim() || null,
          invoice_alias: form.invoice_alias.trim() || null,
        })
        .eq("id", form.id)

      if (localeError) throw localeError

      await Promise.all([
        supabase.from("local_users").update({ locale_nome: nuovoNome }).eq("locale_id", form.id),
        supabase.from("ordini").update({ locale_nome: nuovoNome }).eq("locale_id", form.id),
        supabase.from("giacenze_settimana").update({ locale_nome: nuovoNome }).eq("locale_id", form.id),
        supabase.from("messages").update({ locale_nome: nuovoNome }).eq("locale_id", form.id),
        supabase.from("inventory_alerts").update({ locale_nome: nuovoNome }).eq("locale_id", form.id),
        supabase.from("notifications").update({ locale_nome: nuovoNome }).eq("locale_id", form.id),
        supabase.from("invoice_imports").update({ restaurant_name: nuovoNome }).eq("restaurant_id", form.id),
      ])

      setMessaggio("Locale aggiornato correttamente.")
      setLocaleAperto(null)
      await caricaDati()
    } catch (error: any) {
      setErrore(error?.message || "Errore salvataggio locale")
    }

    setSaving(false)
  }

  function utentiDelLocale(localeId: string) {
    return utenti.filter((u) => String(u.locale_id || "") === String(localeId))
  }

  function ultimoOrdine(localeId: string) {
    return ordini.find((o) => String(o.locale_id || "") === String(localeId))?.created_at || null
  }

  function ultimaGiacenza(localeId: string) {
    return giacenze.find((g) => String(g.locale_id || "") === String(localeId))?.created_at || null
  }

  function dataBreve(data?: string | null) {
    if (!data) return "Mai"
    return new Date(data).toLocaleString("it-IT")
  }

  function nomeUtente(u: UtenteLocale) {
    const nome = `${u.nome || ""} ${u.cognome || ""}`.trim()
    return nome || u.utente || "Utente"
  }

  function vaiUtenti(localeId?: string) {
    if (localeId) {
      window.location.href = `/admin-utenti?locale_id=${encodeURIComponent(localeId)}`
      return
    }

    window.location.href = "/admin-utenti"
  }

  const localiFiltrati = useMemo(() => {
    const q = ricerca.toLowerCase().trim()

    return locali.filter((locale) => {
      if (!q) return true

      const testo = [
        locale.name,
        locale.email,
        locale.invoice_alias,
        ...utentiDelLocale(locale.id).map((u) => `${u.nome} ${u.cognome} ${u.utente}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return testo.includes(q)
    })
  }, [locali, utenti, ricerca])

  const localiConUtenti = locali.filter((locale) => utentiDelLocale(locale.id).length > 0).length
  const utentiAttivi = utenti.filter((u) => u.active !== false).length
  const localiSenzaUtenti = locali.length - localiConUtenti

  function KpiCard({
    title,
    value,
    note,
    icon: Icon,
    tone,
  }: {
    title: string
    value: string | number
    note: string
    icon: any
    tone: string
  }) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {title}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              {value}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{note}</p>
          </div>
          <div className={`rounded-2xl p-3 ${tone}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto w-full max-w-[1600px] space-y-5">
        <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-blue-300">
                Anagrafiche
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                Gestione locali
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-bold text-slate-300 sm:text-base">
                Modifica punti vendita, alias fattura, email e utenti assegnati.
              </p>
            </div>

            <button
              onClick={caricaDati}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:bg-slate-600"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Aggiorno..." : "Aggiorna"}
            </button>
          </div>
        </header>

        {errore && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-700">
            {errore}
          </div>
        )}

        {messaggio && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-700">
            {messaggio}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Locali"
            value={locali.length}
            note="Punti vendita in anagrafica"
            icon={Building2}
            tone="bg-blue-100 text-blue-700"
          />
          <KpiCard
            title="Con utenti"
            value={localiConUtenti}
            note={`${localiSenzaUtenti} senza utenti`}
            icon={Users}
            tone="bg-emerald-100 text-emerald-700"
          />
          <KpiCard
            title="Utenti attivi"
            value={utentiAttivi}
            note={`${utenti.length} utenti totali`}
            icon={ShieldCheck}
            tone="bg-purple-100 text-purple-700"
          />
          <KpiCard
            title="Alias fattura"
            value={locali.filter((l) => String(l.invoice_alias || "").trim()).length}
            note="Locali con alias configurato"
            icon={Mail}
            tone="bg-amber-100 text-amber-700"
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Punti vendita</h2>
              <p className="text-sm font-bold text-slate-500">
                Se modifichi il nome, il sistema aggiorna anche gli storici collegati.
              </p>
            </div>

            <div className="relative w-full xl:w-96">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca locale o responsabile..."
                className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
              Caricamento locali...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {localiFiltrati.map((locale) => {
                const utentiLocale = utentiDelLocale(locale.id)
                const utentiAttiviLocale = utentiLocale.filter((u) => u.active !== false)

                return (
                  <article
                    key={locale.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-xl font-black text-slate-950">
                            {locale.name}
                          </h3>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                            Attivo
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-bold text-slate-600">
                          Email: {locale.email || "-"}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-600">
                          Alias fattura: {locale.invoice_alias || "-"}
                        </p>
                      </div>

                      <button
                        onClick={() => apriModifica(locale)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
                      >
                        <Edit className="h-4 w-4" />
                        Modifica
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-[11px] font-black uppercase text-slate-500">
                          Utenti
                        </p>
                        <p className="mt-1 text-2xl font-black text-slate-950">
                          {utentiAttiviLocale.length}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-[11px] font-black uppercase text-slate-500">
                          Ultimo ordine
                        </p>
                        <p className="mt-1 truncate text-xs font-black text-slate-950">
                          {dataBreve(ultimoOrdine(locale.id))}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-[11px] font-black uppercase text-slate-500">
                          Ultima giacenza
                        </p>
                        <p className="mt-1 truncate text-xs font-black text-slate-950">
                          {dataBreve(ultimaGiacenza(locale.id))}
                        </p>
                      </div>
                      <button
                        onClick={() => vaiUtenti(locale.id)}
                        className="rounded-2xl bg-slate-950 p-3 text-left text-white"
                      >
                        <p className="text-[11px] font-black uppercase text-slate-300">
                          Gestione
                        </p>
                        <p className="mt-1 text-sm font-black">Apri utenti</p>
                      </button>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase text-slate-500">
                          Utenti assegnati
                        </p>
                        <button
                          onClick={() => vaiUtenti(locale.id)}
                          className="text-xs font-black text-blue-600"
                        >
                          Gestisci →
                        </button>
                      </div>

                      <div className="space-y-2">
                        {utentiLocale.slice(0, 4).map((utente) => (
                          <div
                            key={utente.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-950">
                                {nomeUtente(utente)}
                              </p>
                              <p className="truncate text-xs font-bold text-slate-500">
                                @{utente.utente}
                              </p>
                            </div>
                            {utente.active === false ? (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">
                                OFF
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                                ON
                              </span>
                            )}
                          </div>
                        ))}

                        {utentiLocale.length === 0 && (
                          <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-700">
                            Nessun utente assegnato.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}

              {localiFiltrati.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500 xl:col-span-2">
                  Nessun locale trovato.
                </div>
              )}
            </div>
          )}
        </section>
      </section>

      {localeAperto && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/40 p-3">
          <aside className="h-full w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Scheda locale
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {localeAperto.name}
                </h2>
              </div>

              <button
                onClick={() => setLocaleAperto(null)}
                className="rounded-2xl bg-slate-100 p-3 text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-black text-slate-700">
                  Nome locale
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 px-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black text-slate-700">
                  Email locale
                </span>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 px-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black text-slate-700">
                  Alias fattura
                </span>
                <input
                  value={form.invoice_alias}
                  onChange={(e) =>
                    setForm({ ...form, invoice_alias: e.target.value })
                  }
                  placeholder="Nome riconoscibile dentro la fattura PDF"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 px-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-600"
                />
              </label>

              <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">
                Se cambi il nome, il sistema aggiorna anche ordini, giacenze,
                messaggi, notifiche e storico fatture collegati a questo locale.
              </div>

              <button
                onClick={salvaLocale}
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:bg-slate-400"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvataggio..." : "Salva locale"}
              </button>

              <button
                onClick={() => vaiUtenti(localeAperto.id)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
              >
                <Users className="h-4 w-4" />
                Gestisci utenti del locale
              </button>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="mb-3 text-xs font-black uppercase text-slate-500">
                  Utenti assegnati
                </p>

                <div className="space-y-2">
                  {utentiDelLocale(localeAperto.id).map((utente) => (
                    <div
                      key={utente.id}
                      className="rounded-xl bg-white px-3 py-2"
                    >
                      <p className="text-sm font-black text-slate-950">
                        {nomeUtente(utente)}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        @{utente.utente} · {utente.active === false ? "Disattivato" : "Attivo"}
                      </p>
                    </div>
                  ))}

                  {utentiDelLocale(localeAperto.id).length === 0 && (
                    <p className="text-sm font-bold text-slate-500">
                      Nessun utente assegnato.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}