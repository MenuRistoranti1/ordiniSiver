"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AdminCancellazioni() {
  const [tipo, setTipo] = useState("ordini")
  const [locali, setLocali] = useState<any[]>([])
  const [localeId, setLocaleId] = useState("")
  const [dal, setDal] = useState("")
  const [al, setAl] = useState("")
  const [conferma, setConferma] = useState("")

  const [risultati, setRisultati] = useState<any[]>([])
  const [selezionato, setSelezionato] = useState<any>(null)

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

    caricaLocali()

    const oggi = new Date()
    const primo = new Date(oggi.getFullYear(), oggi.getMonth(), 1)

    setDal(primo.toISOString().split("T")[0])
    setAl(oggi.toISOString().split("T")[0])
  }, [])

  async function caricaLocali() {
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .order("name")

    setLocali(data || [])
  }

  async function cercaDati() {
    let query = supabase
      .from(tipo === "ordini" ? "ordini" : "giacenze_settimana")
      .select("*")
      .order("created_at", { ascending: false })

    if (localeId) {
      query = query.eq("locale_id", localeId)
    }

    if (dal) {
      query = query.gte("created_at", `${dal}T00:00:00`)
    }

    if (al) {
      query = query.lte("created_at", `${al}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      console.log(error)
      alert("Errore caricamento dati")
      return
    }

    const gruppi = Object.values(
      (data || []).reduce((acc: any, item: any) => {
        const dataKey =
          item.created_at?.split("T")[0] || "senza-data"

        const locale =
          item.locale_nome ||
          item.responsabile ||
          item.locale_id ||
          "locale"

        const chiave = `${dataKey}-${locale}`

        if (!acc[chiave]) {
          acc[chiave] = {
            id: chiave,
            data: dataKey,
            locale,
            records: [],
          }
        }

        acc[chiave].records.push(item)

        return acc
      }, {})
    )

    setRisultati(gruppi)
    setSelezionato(null)
  }

  async function cancellaSelezionato() {
    if (!selezionato) {
      alert("Seleziona un gruppo da cancellare")
      return
    }

    if (conferma !== "CANCELLA") {
      alert("Scrivi CANCELLA per confermare")
      return
    }

    const ids = selezionato.records.map((r: any) => r.id)

    const { error } = await supabase
      .from(tipo === "ordini" ? "ordini" : "giacenze_settimana")
      .delete()
      .in("id", ids)

    if (error) {
      console.log(error)
      alert("Errore cancellazione")
      return
    }

    alert("Dati cancellati correttamente")

    setConferma("")
    setRisultati([])
    setSelezionato(null)
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-10">
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => window.location.href = "/admin-dashboard"}
          className="bg-blue-600 text-white px-6 py-4 rounded-2xl text-xl font-bold"
        >
          Torna alla dashboard
        </button>

        <button
          onClick={logout}
          className="bg-red-500 text-white px-6 py-4 rounded-2xl text-xl font-bold"
        >
          Logout
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-xl p-10">
        <h1 className="text-5xl font-black mb-4">
          Cancellazioni controllate
        </h1>

        <p className="text-red-600 text-2xl font-bold mb-10">
          Attenzione: questa operazione elimina definitivamente i dati selezionati.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="p-5 rounded-3xl border text-2xl"
          >
            <option value="ordini">Ordini</option>
            <option value="giacenze">Giacenze</option>
          </select>

          <select
            value={localeId}
            onChange={(e) => setLocaleId(e.target.value)}
            className="p-5 rounded-3xl border text-2xl"
          >
            <option value="">Tutti i locali</option>

            {locali.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dal}
            onChange={(e) => setDal(e.target.value)}
            className="p-5 rounded-3xl border text-2xl"
          />

          <input
            type="date"
            value={al}
            onChange={(e) => setAl(e.target.value)}
            className="p-5 rounded-3xl border text-2xl"
          />
        </div>

        <button
          onClick={cercaDati}
          className="w-full bg-blue-600 text-white p-5 rounded-3xl text-2xl font-bold mb-8"
        >
          Carica dati
        </button>

        {risultati.length > 0 && (
          <div className="mb-10">
            <h2 className="text-3xl font-black mb-6">
              Seleziona gruppo da cancellare
            </h2>

            <div className="space-y-4">
              {risultati.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => setSelezionato(r)}
                  className={`w-full text-left p-6 rounded-3xl border-4 transition ${
                    selezionato?.id === r.id
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black">
                        {tipo === "ordini"
                          ? "Ordine"
                          : "Giacenza"}{" "}
                        - {r.data}
                      </h3>

                      <p className="text-xl text-gray-500">
                        Locale: {r.locale}
                      </p>
                    </div>

                    <div className="text-2xl font-bold">
                      {r.records.length} record
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selezionato && (
          <div className="bg-red-50 border border-red-300 rounded-3xl p-8">
            <h2 className="text-3xl font-black mb-6 text-red-700">
              Conferma cancellazione
            </h2>

            <div className="bg-white rounded-2xl p-6 mb-6">
              <p className="text-xl">
                <strong>Tipo:</strong>{" "}
                {tipo === "ordini" ? "Ordini" : "Giacenze"}
              </p>

              <p className="text-xl mt-2">
                <strong>Data:</strong> {selezionato.data}
              </p>

              <p className="text-xl mt-2">
                <strong>Locale:</strong> {selezionato.locale}
              </p>

              <p className="text-xl mt-2">
                <strong>Record:</strong>{" "}
                {selezionato.records.length}
              </p>
            </div>

            <p className="text-2xl font-bold mb-4">
              Seconda conferma: scrivi CANCELLA
            </p>

            <input
              type="text"
              value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              placeholder="CANCELLA"
              className="w-full p-5 rounded-2xl border text-2xl mb-6"
            />

            <button
              onClick={cancellaSelezionato}
              className="w-full bg-red-600 text-white p-6 rounded-3xl text-3xl font-black"
            >
              Cancella dati selezionati
            </button>
          </div>
        )}
      </div>
    </main>
  )
}