"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AdminImportPrezzi() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [risultato, setRisultato] = useState("")

  function parseCSV(text: string) {
    const righe = text.split("\n").filter((r) => r.trim() !== "")
    const headers = righe[0].split(";").map((h) => h.trim())

    return righe.slice(1).map((riga) => {
      const valori = riga.split(";").map((v) => v.trim())
      const obj: any = {}

      headers.forEach((h, i) => {
        obj[h] = valori[i]
      })

      return obj
    })
  }

  async function importaPrezzi() {
    if (!file) {
      alert("Seleziona prima un file CSV")
      return
    }

    setLoading(true)
    setRisultato("")

    const text = await file.text()
    const righe = parseCSV(text)

    let aggiornati = 0
    let nonTrovati = 0

    for (const riga of righe) {
      const codice =
        riga["CodiceArticolo"] ||
        riga["supplier_code"] ||
        riga["Codice"] ||
        ""

      const prezzoTesto =
        riga["PrezzoUnitario"] ||
        riga["price"] ||
        riga["Prezzo"] ||
        ""

      if (!codice || !prezzoTesto) continue

      const prezzo = Number(
        prezzoTesto.replace("€", "").replace(",", ".")
      )

      if (isNaN(prezzo)) continue

      const { data, error } = await supabase
        .from("products")
        .update({ price: prezzo })
        .eq("supplier_code", codice)
        .select("id")

      if (error) {
        console.log(error)
        continue
      }

      if (data && data.length > 0) {
        aggiornati++
      } else {
        nonTrovati++
      }
    }

    setRisultato(
      `Import completato. Prodotti aggiornati: ${aggiornati}. Codici non trovati: ${nonTrovati}.`
    )

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-100 p-12">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          Import Prezzi Prodotti
        </h1>

        <p className="text-xl text-gray-500 mb-8">
          Carica il CSV del fornitore per aggiornare i prezzi dei prodotti.
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full p-5 border rounded-2xl bg-white text-xl mb-6"
        />

        <button
          onClick={importaPrezzi}
          disabled={loading}
          className="w-full bg-blue-600 text-white p-5 rounded-2xl text-2xl font-bold disabled:bg-gray-400"
        >
          {loading ? "Importazione in corso..." : "Importa prezzi"}
        </button>

        {risultato && (
          <div className="mt-8 bg-green-100 border border-green-400 text-green-800 p-5 rounded-2xl text-xl font-bold">
            {risultato}
          </div>
        )}

        <button
          onClick={() => window.location.href = "/admin-dashboard"}
          className="w-full bg-gray-600 text-white p-5 rounded-2xl text-2xl font-bold mt-6"
        >
          Torna alla dashboard
        </button>
      </div>
    </main>
  )
}