export type CategoryPayload = {
  name: string
  active?: boolean
}

async function leggiJsonSicuro(res: Response) {
  const text = await res.text()

  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

export const CategoriesService = {
  async getAll() {
    const res = await fetch("/api/admin/categories", {
      cache: "no-store",
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore caricamento categorie")
    }

    return json.categories || []
  },

  async create(payload: CategoryPayload) {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore creazione categoria")
    }

    return json
  },

  async update(id: string, payload: CategoryPayload) {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore aggiornamento categoria")
    }

    return json
  },

  async delete(id: string) {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore eliminazione categoria")
    }

    return json
  },
}