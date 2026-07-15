"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Link2, Plus, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Restaurant = {
  id: string
  name: string
  invoice_alias: string | null
}

type CompanyLink = {
  id: string
  company_name: string
  restaurant_id: string | null
  restaurant_name: string
  active: boolean
}

export function CompanyRestaurantLinks() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [links, setLinks] = useState<CompanyLink[]>([])
  const [companyName, setCompanyName] = useState("")
  const [restaurantId, setRestaurantId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === restaurantId),
    [restaurants, restaurantId]
  )

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: restaurantsData } = await supabase
      .from("restaurants")
      .select("id, name, invoice_alias")
      .order("name", { ascending: true })

    const { data: linksData } = await supabase
      .from("company_restaurant_links")
      .select("id, company_name, restaurant_id, restaurant_name, active")
      .order("company_name", { ascending: true })

    setRestaurants(restaurantsData ?? [])
    setLinks(linksData ?? [])
    setLoading(false)
  }

  async function createLink() {
    if (!companyName.trim() || !selectedRestaurant) return

    setSaving(true)

    const { error } = await supabase.from("company_restaurant_links").insert({
      company_name: companyName.trim().toUpperCase(),
      restaurant_id: selectedRestaurant.id,
      restaurant_name: selectedRestaurant.name,
      active: true,
    })

    setSaving(false)

    if (error) {
      alert("Errore salvataggio collegamento")
      console.error(error)
      return
    }

    setCompanyName("")
    setRestaurantId("")
    loadData()
  }

  async function deleteLink(id: string) {
    const { error } = await supabase
      .from("company_restaurant_links")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Errore eliminazione collegamento")
      console.error(error)
      return
    }

    loadData()
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <Link2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Collegamenti ragione sociale → locale
            </h2>
            <p className="text-sm text-slate-500">
              Usa questi collegamenti per associare gli inevasi al locale corretto.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b p-5 xl:grid-cols-[1fr_1fr_auto]">
        <input
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Ragione sociale, es. TONNARELLO SRL"
          className="rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-500"
        />

        <select
          value={restaurantId}
          onChange={(event) => setRestaurantId(event.target.value)}
          className="rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Seleziona locale</option>

          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
              {restaurant.invoice_alias ? ` — ${restaurant.invoice_alias}` : ""}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={saving || !companyName.trim() || !restaurantId}
          onClick={createLink}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Aggiungi
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-sm text-slate-500">Caricamento collegamenti...</p>
        ) : links.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nessun collegamento ancora creato.
          </p>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between gap-4 rounded-xl border bg-slate-50 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {link.company_name}
                  </p>

                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Building2 className="h-4 w-4" />
                    {link.restaurant_name}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteLink(link.id)}
                  className="rounded-xl border bg-white p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}