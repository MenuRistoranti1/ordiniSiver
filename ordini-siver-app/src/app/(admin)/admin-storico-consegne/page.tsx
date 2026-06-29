"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AdminStoricoConsegne() {
  const [consegne, setConsegne] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [ricerca, setRicerca] = useState("")
  const [filtroStato, setFiltroStato] = useState("tutti")
  const [localeFiltro, setLocaleFiltro] = useState("tutti")

  const [locali, setLocali] = useState<any[]>([])

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

    caricaDati()
  }, [])

  async function caricaDati() {
    setLoading(true)

    const { data: localiDb } = await supabase
      .from("restaurants")
      .select("id, name")
      .order("name")

    setLocali(localiDb || [])

    const { data, error } = await supabase
      .from("ordini")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.log(error)
      alert("Errore caricamento storico consegne")
      setLoading(false)
      return
    }

    setConsegne(data || [])
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

  const consegneFiltrate = useMemo(() => {
    let lista = [...consegne]

    if (localeFiltro !== "tutti") {
      lista = lista.filter((c) => c.locale_id === localeFiltro)
    }

    if (filtroStato !== "tutti") {
      lista = lista.filter(
        (c) => (c.stato_consegna || "da_consegnare") === filtroStato
      )
    }

    if (ricerca.trim()) {
      const q = ricerca.toLowerCase()

      lista = lista.filter((c) =>
        [
          c.nome_prodotto,
          c.locale_nome,
          c.responsabile,
          c.stato_consegna,
          c.nota_consegna,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    }

    return lista
  }, [consegne, ricerca, filtroStato, localeFiltro])

  const totaleOrdinato = consegneFiltrate.reduce(
    (sum, item) => sum + Number(item.quantita || 0),
    0
  )

  const totaleConsegnato = consegneFiltrate.reduce(
    (sum, item) => sum + Number(item.quantita_consegnata || 0),
    0
  )

  const totaleInevaso = Math.max(
    totaleOrdinato - totaleConsegnato,
    0
  )

  function badge(stato: string) {
    if (stato === "consegnato") {
      return "bg-green-100 text-green-700"
    }

    if (stato === "parziale") {
      return "bg-yellow-100 text-yellow-700"
    }

    return "bg-red-100 text-red-700"
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
     <section className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg">
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-xl font-black">
        Storico Consegne
      </h1>

      <p className="text-sm text-slate-300">
        Admin gestione consegne
      </p>
    </div>

    <div className="flex gap-3">
      <button
        onClick={() =>
          (window.location.href = "/admin-dashboard")
        }
        className="bg-blue-600 px-4 py-2 rounded-xl text-sm font-bold"
      >
        Home Admin
      </button>

      <button
        onClick={logout}
        className="bg-red-500 px-4 py-2 rounded-xl text-sm font-bold"
      >
        Logout
      </button>
    </div>
  </div>
</section>
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="text-xs font-bold text-slate-500">
              Totale ordinato
            </p>

            <h2 className="mt-2 text-3xl font-black">
              {totaleOrdinato}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="text-xs font-bold text-slate-500">
              Totale consegnato
            </p>

            <h2 className="mt-2 text-3xl font-black text-green-700">
              {totaleConsegnato}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="text-xs font-bold text-slate-500">
              Totale inevaso
            </p>

            <h2 className="mt-2 text-3xl font-black text-red-700">
              {totaleInevaso}
            </h2>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <input
            type="text"
            placeholder="Cerca prodotto, locale..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          />

          <select
            value={localeFiltro}
            onChange={(e) => setLocaleFiltro(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="tutti">Tutti i locali</option>

            {locali.map((locale) => (
              <option key={locale.id} value={locale.id}>
                {locale.name}
              </option>
            ))}
          </select>

          <select
            value={filtroStato}
            onChange={(e) => setFiltroStato(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="tutti">Tutti gli stati</option>
            <option value="consegnato">Consegnato</option>
            <option value="parziale">Parziale</option>
            <option value="da_consegnare">Da consegnare</option>
          </select>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="hidden grid-cols-[1fr_120px_120px_140px_1fr] bg-slate-950 text-xs font-bold uppercase tracking-wide text-white md:grid">
            <div className="px-4 py-3">Prodotto</div>
            <div className="px-4 py-3">Ordinato</div>
            <div className="px-4 py-3">Consegnato</div>
            <div className="px-4 py-3">Stato</div>
            <div className="px-4 py-3">Note</div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">
              Caricamento...
            </div>
          ) : (
            <>
              {consegneFiltrate.map((ordine, index) => (
                <div
                  key={ordine.id}
                  className={`grid grid-cols-1 gap-2 border-b border-slate-100 px-4 py-4 md:grid-cols-[1fr_120px_120px_140px_1fr] md:items-center ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      {ordine.nome_prodotto}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {ordine.locale_nome}
                    </p>
                  </div>

                  <div className="text-sm font-bold">
                    {ordine.quantita}
                  </div>

                  <div className="text-sm font-bold text-green-700">
                    {ordine.quantita_consegnata || 0}
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${badge(
                        ordine.stato_consegna || "da_consegnare"
                      )}`}
                    >
                      {(ordine.stato_consegna || "da_consegnare").replace(
                        "_",
                        " "
                      )}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500">
                    {ordine.nota_consegna || "-"}
                  </div>
                </div>
              ))}

              {consegneFiltrate.length === 0 && (
                <div className="p-8 text-center text-sm font-bold text-slate-500">
                  Nessuna consegna trovata.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}