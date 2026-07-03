"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { MessageCircle, RefreshCw, Search, Send } from "lucide-react"
import { supabase } from "@/lib/supabase"

type LocaleChat = {
  locale_id: string
  locale_nome: string
  unread: number
  last_message_at: string | null
}

type Messaggio = {
  id: string
  locale_id: string
  locale_nome: string
  sender: "admin" | "locale" | string
  message: string
  is_read?: boolean | null
  created_at?: string | null
}

export default function AdminMessaggi() {
  const [locali, setLocali] = useState<LocaleChat[]>([])
  const [localeSelezionato, setLocaleSelezionato] = useState<LocaleChat | null>(null)
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState("")
  const [ricerca, setRicerca] = useState("")
  const [loadingLocali, setLoadingLocali] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)
  const [sending, setSending] = useState(false)

  const fondoChatRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    caricaLocaliConMessaggi()
  }, [])

  useEffect(() => {
    fondoChatRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messaggi])

  useEffect(() => {
    const channel = supabase
      .channel("admin-messaggi-v2")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        async (payload: any) => {
          await caricaLocaliConMessaggi()

          const localeIdAttuale = localeSelezionato?.locale_id
          const nuovaRiga = payload?.new

          if (localeIdAttuale && nuovaRiga?.locale_id === localeIdAttuale) {
            await caricaMessaggi(localeIdAttuale)
            await segnaComeLetti(localeIdAttuale)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [localeSelezionato?.locale_id])

  function dataOraIt(data?: string | null) {
    if (!data) return ""
    const d = new Date(data)
    if (Number.isNaN(d.getTime())) return ""

    return d.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function normalizza(testo: string) {
    return String(testo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
  }

  async function caricaLocaliConMessaggi() {
    setLoadingLocali(true)

    const { data: localiDb, error: errorLocali } = await supabase
      .from("restaurants")
      .select("id, name")
      .order("name")

    if (errorLocali) {
      console.log(errorLocali)
      setLoadingLocali(false)
      return
    }

    const { data: messaggiDb, error: errorMessaggi } = await supabase
      .from("messages")
      .select("locale_id, locale_nome, sender, is_read, created_at")
      .order("created_at", { ascending: false })

    if (errorMessaggi) {
      console.log(errorMessaggi)
      setLoadingLocali(false)
      return
    }

    const gruppi: Record<string, LocaleChat> = {}

    ;(localiDb || []).forEach((locale: any) => {
      gruppi[locale.id] = {
        locale_id: locale.id,
        locale_nome: locale.name,
        unread: 0,
        last_message_at: null,
      }
    })

    ;(messaggiDb || []).forEach((msg: any) => {
      if (!gruppi[msg.locale_id]) return

      if (!gruppi[msg.locale_id].last_message_at) {
        gruppi[msg.locale_id].last_message_at = msg.created_at
      }

      if (!msg.is_read && msg.sender !== "admin") {
        gruppi[msg.locale_id].unread += 1
      }
    })

    setLocali(Object.values(gruppi))
    setLoadingLocali(false)
  }

  async function caricaMessaggi(localeId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("locale_id", localeId)
      .order("created_at", { ascending: true })

    if (error) {
      console.log(error)
      alert("Errore apertura chat")
      return
    }

    setMessaggi((data || []) as Messaggio[])
  }

  async function segnaComeLetti(localeId: string) {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("locale_id", localeId)
      .eq("sender", "locale")
  }

  async function apriChat(locale: LocaleChat) {
    setLocaleSelezionato(locale)
    setLoadingChat(true)

    await caricaMessaggi(locale.locale_id)
    await segnaComeLetti(locale.locale_id)
    await caricaLocaliConMessaggi()

    setLoadingChat(false)
  }

  async function aggiornaPagina() {
    await caricaLocaliConMessaggi()

    if (localeSelezionato) {
      await caricaMessaggi(localeSelezionato.locale_id)
      await segnaComeLetti(localeSelezionato.locale_id)
    }
  }

  async function inviaRisposta() {
    if (!localeSelezionato) {
      alert("Seleziona un locale")
      return
    }

    if (!testo.trim()) {
      alert("Scrivi un messaggio")
      return
    }

    if (sending) return
    setSending(true)

    const messaggioDaInviare = testo.trim()

    const { error } = await supabase.from("messages").insert({
      locale_id: localeSelezionato.locale_id,
      locale_nome: localeSelezionato.locale_nome,
      sender: "admin",
      message: messaggioDaInviare,
      is_read: false,
    })

    if (error) {
      console.log(error)
      alert("Errore invio risposta")
      setSending(false)
      return
    }

    setTesto("")
    await caricaMessaggi(localeSelezionato.locale_id)
    await caricaLocaliConMessaggi()
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      inviaRisposta()
    }
  }

  const localiFiltrati = useMemo(() => {
    const q = normalizza(ricerca)
    if (!q) return locali

    return locali.filter((locale) => normalizza(locale.locale_nome).includes(q))
  }, [locali, ricerca])

  const totaleNonLetti = locali.reduce((sum, locale) => sum + locale.unread, 0)

  return (
    <div className="mx-auto flex h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4 overflow-hidden p-3 sm:h-[calc(100vh-3rem)] sm:p-4 lg:p-6">
      <section className="flex shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Messaggi
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-600">
            Conversazioni tra locali e amministrazione
          </p>
        </div>

        <button
          onClick={aggiornaPagina}
          disabled={loadingLocali || loadingChat}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:bg-slate-400"
        >
          <RefreshCw
            className={`h-4 w-4 ${loadingLocali || loadingChat ? "animate-spin" : ""}`}
          />
          Aggiorna
        </button>
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="shrink-0 border-b border-slate-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
                  Locali
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {locali.length} conversazioni
                  {totaleNonLetti > 0 ? ` · ${totaleNonLetti} non letti` : ""}
                </p>
              </div>

              {totaleNonLetti > 0 && (
                <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                  {totaleNonLetti}
                </span>
              )}
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca locale..."
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {loadingLocali && locali.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm font-black text-slate-500">
                Caricamento locali...
              </div>
            )}

            {!loadingLocali && localiFiltrati.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm font-black text-slate-500">
                Nessun locale trovato.
              </div>
            )}

            {localiFiltrati.map((locale) => {
              const attivo = localeSelezionato?.locale_id === locale.locale_id

              return (
                <button
                  key={locale.locale_id}
                  onClick={() => apriChat(locale)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    attivo
                      ? "border-blue-600 bg-blue-600 text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-950 hover:border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black uppercase">
                        {locale.locale_nome}
                      </p>

                      <p
                        className={`mt-1 text-xs font-bold ${
                          attivo ? "text-blue-100" : "text-slate-500"
                        }`}
                      >
                        {locale.last_message_at
                          ? dataOraIt(locale.last_message_at)
                          : "Nessun messaggio"}
                      </p>
                    </div>

                    {locale.unread > 0 && (
                      <span className="shrink-0 rounded-full bg-red-500 px-2.5 py-1 text-xs font-black text-white">
                        {locale.unread}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!localeSelezionato ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
              <div className="max-w-md">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <MessageCircle className="h-8 w-8" />
                </div>

                <h2 className="mt-4 text-2xl font-black text-slate-950">
                  Seleziona un locale
                </h2>

                <p className="mt-2 text-sm font-bold text-slate-600">
                  Scegli una conversazione dalla lista per leggere e rispondere ai messaggi.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-slate-100 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-black uppercase text-slate-950 sm:text-3xl">
                      {localeSelezionato.locale_nome}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-slate-600">
                      Conversazione con il locale
                    </p>
                  </div>

                  <button
                    onClick={aggiornaPagina}
                    disabled={loadingChat || loadingLocali}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:bg-slate-400"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loadingChat || loadingLocali ? "animate-spin" : ""}`}
                    />
                    Aggiorna
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {loadingChat && (
                  <div className="rounded-xl bg-white p-4 text-center text-sm font-black text-slate-500 shadow-sm">
                    Caricamento chat...
                  </div>
                )}

                {!loadingChat && messaggi.length === 0 && (
                  <div className="rounded-xl bg-white p-4 text-center text-sm font-black text-slate-500 shadow-sm">
                    Nessun messaggio in questa conversazione.
                  </div>
                )}

                {messaggi.map((msg) => {
                  const admin = msg.sender === "admin"

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${admin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl p-4 shadow-sm sm:max-w-[75%] ${
                          admin
                            ? "bg-blue-600 text-white"
                            : "border border-slate-200 bg-white text-slate-950"
                        }`}
                      >
                        <p
                          className={`mb-2 text-xs font-black uppercase ${
                            admin ? "text-blue-100" : "text-slate-500"
                          }`}
                        >
                          {admin ? "Admin" : localeSelezionato.locale_nome}
                        </p>

                        <p className="whitespace-pre-wrap break-words text-sm font-bold leading-relaxed sm:text-base">
                          {msg.message}
                        </p>

                        <p
                          className={`mt-2 text-[11px] font-bold ${
                            admin ? "text-blue-100" : "text-slate-500"
                          }`}
                        >
                          {dataOraIt(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}

                <div ref={fondoChatRef} />
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-white p-4">
                <textarea
                  value={testo}
                  onChange={(e) => setTesto(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scrivi risposta..."
                  className="min-h-[110px] w-full resize-none rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600"
                />

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-bold text-slate-500">
                    Invio = manda · Shift + Invio = nuova riga
                  </p>

                  <button
                    onClick={inviaRisposta}
                    disabled={sending || !testo.trim()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-black text-white disabled:bg-slate-400"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "Invio..." : "Invia risposta"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </section>
    </div>
  )
}