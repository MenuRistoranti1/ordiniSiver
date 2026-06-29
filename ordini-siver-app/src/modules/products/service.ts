export type ProductPayload = {
  name: string
  supplier_code?: string
  internal_code?: string
  barcode?: string
  category?: string
  category_id?: string | null
  unit?: string
  unit_id?: string | null
  price?: string | number | null
  vat?: string | number | null
  min_stock?: string | number | null
  max_stock?: string | number | null
  required_stock?: boolean
  active?: boolean
  image_url?: string
  notes?: string
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

export const ProductsService = {
  async getAll() {
    const res = await fetch("/api/admin/products", {
      cache: "no-store",
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore caricamento prodotti")
    }

    return json.products || []
  },

  async create(payload: ProductPayload) {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore creazione prodotto")
    }

    return json
  },

  async update(id: string, payload: ProductPayload) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore aggiornamento prodotto")
    }

    return json
  },

  async delete(id: string) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
    })

    const json = await leggiJsonSicuro(res)

    if (!res.ok) {
      throw new Error(json.error || "Errore eliminazione prodotto")
    }

    return json
  },
}