"use client"

import { useEffect, useRef } from "react"
import { MessageCircle, RefreshCw, Send } from "lucide-react"
import { LocaleShell } from "@/components/locale/LocaleShell"
import { useLocaleMessages } from "@/hooks/useLocaleMessages"

export default function MessaggiLocalePage() {
  const {
    messaggi,
    testo,
    setTesto,
    nomeMittente,
    setNomeMittente,
    localeId,
    localeNome,
    loading,
    sending,
    aggiornaMessaggi,
    inviaMessaggio,
  } = useLocaleMessages()

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messaggi])

  return (
    <LocaleShell>
      <header className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              Comunicazioni
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Messaggi Admin
            </h1>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {localeNome || "Caricamento..."} · Comunicazioni con
              l&apos;amministrazione
            </p>
          </div>

          <button
            type="button"
            onClick={() => void aggiornaMessaggi(localeId)}
            disabled={loading || !localeId}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:bg-slate-400"
          >
            <RefreshCw
              className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Aggiorno..." : "Aggiorna"}
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <MessageCircle className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-950">
              Conversazione
            </h2>
            <p className="text-sm font-bold text-slate-500">
              I messaggi dell&apos;admin vengono segnati come letti
              automaticamente.
            </p>
          </div>
        </div>

        <div className="max-h-[55vh] min-h-72 space-y-3 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {loading && messaggi.length === 0 && (
            <p className="text-sm font-bold text-slate-500">
              Caricamento messaggi...
            </p>
          )}

          {!loading && messaggi.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <p className="font-black text-slate-800">
                Nessun messaggio presente
              </p>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Usa il modulo qui sotto per scrivere all&apos;amministrazione.
              </p>
            </div>
          )}

          {messaggi.map((msg) => {
            const inviatoDalLocale = msg.sender === "locale"

            return (
              <article
                key={msg.id}
                className={`max-w-[90%] rounded-3xl p-4 shadow-sm sm:max-w-[75%] ${
                  inviatoDalLocale
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto border border-slate-200 bg-white text-slate-950"
                }`}
              >
                <p className="mb-2 text-xs font-black uppercase tracking-wide opacity-75">
                  {inviatoDalLocale
                    ? msg.nome_mittente || localeNome
                    : "Admin"}
                </p>

                <p className="whitespace-pre-wrap text-sm font-bold sm:text-base">
                  {msg.message}
                </p>

                <p
                  className={`mt-3 text-[11px] font-bold ${
                    inviatoDalLocale
                      ? "text-blue-100"
                      : "text-slate-500"
                  }`}
                >
                  {formatDate(msg.created_at)}
                </p>
              </article>
            )
          })}

          <div ref={messagesEndRef} />
        </div>

        <div className="space-y-3 border-t border-slate-200 p-4 sm:p-6">
          <input
            type="text"
            value={nomeMittente}
            onChange={(event) => setNomeMittente(event.target.value)}
            placeholder="Nome di chi scrive"
            disabled={sending}
            className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-black text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 disabled:bg-slate-100"
          />

          <textarea
            value={testo}
            onChange={(event) => setTesto(event.target.value)}
            placeholder="Scrivi un messaggio all'admin..."
            disabled={sending}
            className="min-h-36 w-full resize-y rounded-2xl border-2 border-slate-200 bg-white p-4 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 disabled:bg-slate-100"
          />

          <button
            type="button"
            onClick={() => void inviaMessaggio()}
            disabled={sending || loading}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-black text-white transition hover:bg-blue-700 disabled:bg-slate-400"
          >
            <Send className="h-5 w-5" />
            {sending ? "Invio in corso..." : "Invia messaggio"}
          </button>
        </div>
      </section>
    </LocaleShell>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}