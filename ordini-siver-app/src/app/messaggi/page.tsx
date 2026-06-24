"use client"

import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"
import { supabase } from "@/lib/supabase"

export default function MessaggiLocale() {
  const [messaggi, setMessaggi] = useState<any[]>([])
  const [testo, setTesto] = useState("")
  const [nomeMittente, setNomeMittente] = useState("")
  const [localeId, setLocaleId] = useState("")
  const [localeNome, setLocaleNome] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem("locale_id") || ""
    const nome = localStorage.getItem("locale_nome") || ""

    if (!id) {
      window.location.href = "/"
      return
    }

    setLocaleId(id)
    setLocaleNome(nome)
    caricaMessaggi(id)
  }, [])

  async function caricaMessaggi(id: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("locale_id", id)
      .order("created_at", { ascending: true })

    if (error) {
      console.log(error)
      alert("Errore caricamento messaggi")
      return
    }

    setMessaggi(data || [])

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("locale_id", id)
      .eq("sender", "admin")
  }

  async function inviaMessaggio() {
    if (!nomeMittente.trim()) {
      alert("Inserisci il nome di chi scrive")
      return
    }

    if (!testo.trim()) {
      alert("Scrivi un messaggio")
      return
    }

    const { error } = await supabase.from("messages").insert({
      locale_id: localeId,
      locale_nome: localeNome,
      sender: "locale",
      nome_mittente: nomeMittente.trim(),
      message: testo.trim(),
      is_read: false,
    })

    if (error) {
      console.log(error)
      alert("Errore invio messaggio")
      return
    }

    setTesto("")
    caricaMessaggi(localeId)
  }

  function logout() {
    localStorage.clear()
    window.location.href = "/"
  }

  return (
    <main className="min-h-screen bg-slate-100 lg:flex">
      <button
        onClick={() => setMenuOpen(true)}
        className="hidden"
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
        className="fixed left-0 top-0 z-50 hidden h-screen w-72 flex-col bg-[#07132b] p-6 text-white lg:flex"
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="mb-6 flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold lg:hidden"
        >
          <X className="h-4 w-4" />
          Chiudi
        </button>

        <div className="mb-10">
          <h1 className="text-3xl font-black">OrdiniSiver</h1>
          <p className="mt-1 text-slate-400">Messaggi</p>
        </div>

        <nav className="flex-1 space-y-3">
          <button
            onClick={() => window.location.href = "/dashboard"}
            className="w-full rounded-2xl bg-blue-600 p-4 text-left font-bold"
          >
            Dashboard
          </button>

          <button
            onClick={() => window.location.href = "/giacenze"}
            className="w-full rounded-2xl p-4 text-left hover:bg-[#16213f]"
          >
            Giacenze settimana
          </button>

          <button
            onClick={() => window.location.href = "/nuovo-ordine"}
            className="w-full rounded-2xl p-4 text-left hover:bg-[#16213f]"
          >
            Nuovo ordine
          </button>

          <button
            onClick={() => window.location.href = "/storico-giacenze"}
            className="w-full rounded-2xl p-4 text-left hover:bg-[#16213f]"
          >
            Storico giacenze
          </button>

          <button
            onClick={() => window.location.href = "/storico-ordini"}
            className="w-full rounded-2xl p-4 text-left hover:bg-[#16213f]"
          >
            Storico ordini
          </button>

          <button
            onClick={() => window.location.href = "/messaggi"}
            className="w-full rounded-2xl bg-blue-600 p-4 text-left font-bold"
          >
            Messaggi admin
          </button>
        </nav>

        <button
          onClick={logout}
          className="rounded-2xl bg-red-500 p-4 font-bold"
        >
          Logout
        </button>
      </aside>

      <section className="w-full p-3 pt-4 sm:p-4 lg:ml-72 lg:p-10">
        <LocaleMobileHeader />
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-950 sm:text-5xl">
              Messaggi Admin
            </h1>

            <p className="mt-1 text-sm font-bold text-slate-600 sm:text-xl">
              Locale: {localeNome}
            </p>
          </div>

          <button
            onClick={() => caricaMessaggi(localeId)}
            className="h-12 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white"
          >
            Aggiorna
          </button>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-xl sm:p-6">
          <div className="mb-6 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {messaggi.length === 0 && (
              <p className="text-base font-bold text-slate-500">
                Nessun messaggio presente.
              </p>
            )}

            {messaggi.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[90%] rounded-2xl p-4 shadow-sm ${
                  msg.sender === "locale"
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-slate-200 text-slate-950"
                }`}
              >
                <p className="mb-2 text-xs font-black uppercase opacity-80">
                  {msg.sender === "locale"
                    ? `${msg.nome_mittente || localeNome}`
                    : "Admin"}
                </p>

                <p className="whitespace-pre-wrap text-sm font-bold sm:text-base">
                  {msg.message}
                </p>

                <p
                  className={`mt-2 text-[10px] font-bold ${
                    msg.sender === "locale"
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

          <input
            type="text"
            placeholder="Nome di chi scrive"
            value={nomeMittente}
            onChange={(e) => setNomeMittente(e.target.value)}
            className="mb-3 h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-black text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
          />

          <textarea
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Scrivi un messaggio all'admin..."
            className="mb-3 min-h-[140px] w-full rounded-2xl border-2 border-slate-300 bg-white p-4 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-600"
          />

          <button
            onClick={inviaMessaggio}
            className="h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white"
          >
            Invia messaggio
          </button>
        </div>
      </section>
    </main>
  )
}