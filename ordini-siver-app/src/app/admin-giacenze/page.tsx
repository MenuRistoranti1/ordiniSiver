"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AdminGiacenze() {
  const [giacenze, setGiacenze] = useState<any[]>([])
  const [localeNome, setLocaleNome] = useState("")

  useEffect(() => {
    if (localStorage.getItem("admin") !== "true") {
      window.location.href = "/admin"
      return
    }

    caricaGiacenze()
  }, [])

  async function caricaGiacenze() {
    const params = new URLSearchParams(window.location.search)
    const localeId = params.get("locale_id")

    if (!localeId) {
      alert("Locale non selezionato")
      window.location.href = "/admin-dashboard"
      return
    }

    const { data: locale } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", localeId)
      .single()

    setLocaleNome(locale?.name || "")

    const { data, error } = await supabase
      .from("giacenze_settimana")
      .select("*")
      .eq("locale_id", localeId)
      .order("nome_prodotto", { ascending: true })

    if (error) {
      console.log(error)
      alert("Errore caricamento giacenze")
      return
    }

    setGiacenze(data || [])
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem("admin")
    localStorage.removeItem("admin_mode")
    window.location.href = "/admin"
  }

  return (
    <main className="min-h-screen bg-gray-100 p-12">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow">
        <button
          onClick={() => window.location.href = "/admin-dashboard"}
          className="bg-blue-500 text-white px-5 py-3 rounded-xl text-xl font-bold"
        >
          Home Admin
        </button>

        <button
          onClick={logout}
          className="bg-red-500 text-white px-5 py-3 rounded-xl text-xl font-bold"
        >
          Logout
        </button>
      </div>

      <h1 className="text-5xl font-bold mb-3">
        Giacenze Locale
      </h1>

      <p className="text-3xl text-gray-500 mb-10">
        {localeNome}
      </p>

      <div className="bg-white rounded-3xl shadow-xl p-8">
        {giacenze.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-2 gap-6 border-b py-4"
          >
            <div className="text-2xl font-semibold">
              {item.nome_prodotto}
            </div>

            <div className="text-2xl">
              {item.quantita}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}