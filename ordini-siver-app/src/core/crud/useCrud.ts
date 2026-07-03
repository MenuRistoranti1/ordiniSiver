"use client"

import { useMemo, useState } from "react"
import type { CrudRepository, CrudState } from "./types"

export function useCrud<T, Form>(
  repository: CrudRepository<T, Form>,
  options?: {
    searchFields?: (keyof T)[]
    messages?: {
      created?: string
      updated?: string
      removed?: string
    }
  }
): CrudState<T> {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  async function load() {
    setLoading(true)
    setError("")

    try {
      const data = await repository.load()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  async function create(form: any) {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      await repository.create(form)
      setMessage(options?.messages?.created || "Elemento creato correttamente.")
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function update(id: string, form: any) {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      await repository.update(id, form)
      setMessage(options?.messages?.updated || "Elemento aggiornato correttamente.")
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      await repository.remove(id)
      setMessage(options?.messages?.removed || "Elemento disattivato correttamente.")
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return items

    return items.filter((item) => {
      if (options?.searchFields?.length) {
        return options.searchFields.some((field) =>
          String(item[field] || "").toLowerCase().includes(q)
        )
      }

      return Object.values(item as Record<string, unknown>)
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [items, search, options?.searchFields])

  return {
    items,
    filteredItems,
    loading,
    saving,
    message,
    error,
    search,
    setSearch,
    load,
    create,
    update,
    remove,
  }
}