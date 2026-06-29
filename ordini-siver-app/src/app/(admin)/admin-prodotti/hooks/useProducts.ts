"use client"

import { useMemo, useState } from "react"
import type { Product, ProductForm, ProductStats } from "../types"

async function leggiJsonSicuro(res: Response) {
  const text = await res.text()

  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

const emptyForm: ProductForm = {
  name: "",
  supplier_code: "",
  internal_code: "",
  barcode: "",
  category: "",
  unit: "",
  price: "",
  vat: "",
  min_stock: "",
  max_stock: "",
  required_stock: false,
  active: true,
  image_url: "",
  notes: "",
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messaggio, setMessaggio] = useState("")
  const [errore, setErrore] = useState("")

  const [ricerca, setRicerca] = useState("")
  const [filtroCategoria, setFiltroCategoria] = useState("tutte")
  const [filtroStato, setFiltroStato] = useState("tutti")

  async function caricaProdotti() {
    setLoading(true)
    setErrore("")

    try {
      const res = await fetch("/api/admin/products", {
        cache: "no-store",
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore caricamento prodotti")
      }

      setProducts(json.products || [])
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  async function creaProdotto(form: ProductForm) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore creazione prodotto")
      }

      setMessaggio("Prodotto creato correttamente.")
      await caricaProdotti()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function aggiornaProdotto(id: string, form: ProductForm) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore aggiornamento prodotto")
      }

      setMessaggio("Prodotto aggiornato correttamente.")
      await caricaProdotti()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function cambiaStato(id: string, active: boolean) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active }),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore aggiornamento stato")
      }

      setMessaggio(active ? "Prodotto attivato." : "Prodotto disattivato.")
      await caricaProdotti()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function eliminaProdotto(id: string) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore eliminazione prodotto")
      }

      setMessaggio("Prodotto eliminato correttamente.")
      await caricaProdotti()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  const categorie = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((p) => String(p.category || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [products])

  const productsFiltrati = useMemo(() => {
    const q = ricerca.toLowerCase().trim()

    return products.filter((product) => {
      const matchRicerca =
        !q ||
        [
          product.name,
          product.supplier_code,
          product.internal_code,
          product.barcode,
          product.category,
          product.unit,
          product.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))

      const matchCategoria =
        filtroCategoria === "tutte" || product.category === filtroCategoria

      const matchStato =
        filtroStato === "tutti" ||
        (filtroStato === "attivi" && product.active) ||
        (filtroStato === "disattivati" && !product.active)

      return matchRicerca && matchCategoria && matchStato
    })
  }, [products, ricerca, filtroCategoria, filtroStato])

  const statistiche: ProductStats = useMemo(() => {
    const attivi = products.filter((p) => p.active).length
    const disattivati = products.filter((p) => !p.active).length
    const categorieCount = categorie.length

    return {
      totali: products.length,
      attivi,
      disattivati,
      categorie: categorieCount,
    }
  }, [products, categorie])

  return {
    products,
    productsFiltrati,
    categorie,
    statistiche,
    loading,
    saving,
    messaggio,
    errore,
    ricerca,
    setRicerca,
    filtroCategoria,
    setFiltroCategoria,
    filtroStato,
    setFiltroStato,
    emptyForm,
    caricaProdotti,
    creaProdotto,
    aggiornaProdotto,
    cambiaStato,
    eliminaProdotto,
  }
}