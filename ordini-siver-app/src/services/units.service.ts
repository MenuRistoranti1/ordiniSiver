export type UnitPayload = {
  code: string
  description?: string
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

export const UnitsService = {
  async getAll() {
    const res = await fetch("/api/admin/units", {
      cache: "no-store",
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore caricamento unità")
    }

    return json.units || []
  },

  async create(payload: UnitPayload) {
    const res = await fetch("/api/admin/units", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore creazione unità")
    }

    return json
  },

  async update(id: string, payload: UnitPayload) {
    const res = await fetch(`/api/admin/units/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore aggiornamento unità")
    }

    return json
  },

  async delete(id: string) {
    const res = await fetch(`/api/admin/units/${id}`, {
      method: "DELETE",
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore eliminazione unità")
    }

    return json
  },
}