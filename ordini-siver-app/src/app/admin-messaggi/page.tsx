"use client"

import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AdminMessaggi() {
  const [locali, setLocali] = useState<any[]>([])
  const [localeSelezionato, setLocaleSelezionato] = useState<any>(null)
  const [messaggi, setMessaggi] = useState<any[]>([])
  const [testo, setTesto] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

    caricaLocaliConMessaggi()
  }, [])

  async function caricaLocaliConMessaggi() {
  const { data: localiDb, error: errorLocali } = await supabase
    .from("restaurants")
    .select("id, name")
    .order("name")

  if (errorLocali) {
    console.log(errorLocali)
    return
  }

  const { data: messaggiDb, error: errorMessaggi } = await supabase
    .from("messages")
    .select("locale_id, locale_nome, sender, is_read, created_at")
    .order("created_at", { ascending: false })

  if (errorMessaggi) {
    console.log(errorMessaggi)
    return
  }

  const gruppi: any = {}

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
}

  async function apriChat(locale: any) {
    setLocaleSelezionato(locale)
    setMenuOpen(false)

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("locale_id", locale.locale_id)
      .order("created_at", { ascending: true })

    if (error) {
      console.log(error)
      alert("Errore apertura chat")
      return
    }

    setMessaggi(data || [])

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("locale_id", locale.locale_id)
      .eq("sender", "locale")

    caricaLocaliConMessaggi()
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

    const { error } = await supabase.from("messages").insert({
      locale_id: localeSelezionato.locale_id,
      locale_nome: localeSelezionato.locale_nome,
      sender: "admin",
      message: testo.trim(),
      is_read: false,
    })

    if (error) {
      console.log(error)
      alert("Errore invio risposta")
      return
    }

    setTesto("")
    apriChat(localeSelezionato)
  }

  function logout() {
    localStorage.removeItem("admin")
    window.location.href = "/"
  }

  return (
    <main className="min-h-screen bg-slate-100 lg:flex">
      <button
        onClick={() => setMenuOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-xl bg-[#07132b] p-3 text-white shadow-lg lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-80 flex-col bg-[#07132b] p-6 text-white transition-transform duration-300 lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="mb-6 flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold lg:hidden"
        >
          <X className="h-4 w-4" />
          Chiudi
        </button>

        <h1 className="mb-2 text-3xl font-black">Messaggi</h1>
        <p className="mb-6 font-semibold text-slate-300">
          Chat locali ↔ admin
        </p>

        <button
          onClick={() => (window.location.href = "/admin-dashboard")}
          className="mb-3 w-full rounded-2xl bg-blue-600 p-4 text-left font-bold"
        >
          Dashboard
        </button>

        <button
          onClick={logout}
          className="mb-6 w-full rounded-2xl bg-red-500 p-4 text-left font-bold"
        >
          Logout
        </button>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {locali.length === 0 && (
            <p className="font-bold text-slate-300">Nessun messaggio.</p>
          )}

          {locali.map((locale: any) => (
            <button
              key={locale.locale_id}
              onClick={() => apriChat(locale)}
              className={`w-full rounded-2xl p-4 text-left ${
                localeSelezionato?.locale_id === locale.locale_id
                  ? "bg-blue-600"
                  : "bg-[#111f3d] hover:bg-[#162b55]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-black">{locale.locale_nome}</span>

                {locale.unread > 0 && (
                  <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-black text-white">
                    {locale.unread}
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs font-bold text-slate-300">
                {locale.last_message_at
                  ? new Date(locale.last_message_at).toLocaleString("it-IT")
                  : ""}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <section className="w-full p-4 pt-20 lg:ml-80 lg:p-10">
        {!localeSelezionato ? (
          <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-10">
            <h2 className="mb-3 text-3xl font-black text-slate-950 sm:text-4xl">
              Seleziona un locale
            </h2>

            <p className="text-base font-bold text-slate-600 sm:text-xl">
              Apri il menu e scegli una chat.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-4 shadow-xl sm:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
                  {localeSelezionato.locale_nome}
                </h2>

                <p className="text-sm font-bold text-slate-600 sm:text-xl">
                  Conversazione con il locale
                </p>
              </div>

              <button
                onClick={() => caricaLocaliConMessaggi()}
                className="h-12 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white"
              >
                Aggiorna
              </button>
            </div>

            <div className="mb-6 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {messaggi.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[90%] rounded-2xl p-4 shadow-sm ${
                    msg.sender === "admin"
                      ? "ml-auto bg-blue-600 text-white"
                      : "mr-auto bg-slate-200 text-slate-950"
                  }`}
                >
                  <p className="mb-2 text-xs font-black uppercase opacity-80">
                    {msg.sender === "admin"
                      ? "Admin"
                      : localeSelezionato.locale_nome}
                  </p>

                  <p className="whitespace-pre-wrap text-sm font-bold sm:text-base">
                    {msg.message}
                  </p>

                  <p
                    className={`mt-2 text-[10px] font-bold ${
                      msg.sender === "admin"
                        ? "text-blue-100"
                        : "text-slate-500"
                    }`}
                  >
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleString("it-IT")
                      : ""}
                  </p>
                </div>
              ))}
            </div>

            <textarea
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              placeholder="Scrivi risposta..."
              className="mb-3 min-h-[140px] w-full rounded-2xl border-2 border-slate-300 bg-white p-4 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
            />

            <button
              onClick={inviaRisposta}
              className="h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white"
            >
              Invia risposta
            </button>
          </div>
        )}
      </section>
    </main>
  )
}