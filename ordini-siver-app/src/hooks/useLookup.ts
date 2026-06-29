"use client"

import { useEffect, useState } from "react"
import { CRUD_LOOKUPS } from "@/components/crud-engine/lookups"

type LookupItem = {
  id: string
  [key: string]: any
}

const cache = new Map<string, LookupItem[]>()

export function useLookup(source?: string) {
  const [items, setItems] = useState<LookupItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!source) return

    const config = CRUD_LOOKUPS[source]

    if (!config) {
      console.warn(`Lookup "${source}" non configurato`)
      return
    }

    async function load() {
      if (cache.has(source)) {
        setItems(cache.get(source)!)
        return
      }

      setLoading(true)

      try {
        const res = await fetch(config.endpoint)
        const json = await res.json()

        const data = json[config.responseKey] || []

        cache.set(source, data)
        setItems(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [source])

  return {
    items,
    loading,
    config: source ? CRUD_LOOKUPS[source] : undefined,
  }
}