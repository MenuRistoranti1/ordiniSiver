"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { CRUD_LOOKUPS } from "@/components/crud-engine/lookups"

type LookupItem = {
  id: string
  [key: string]: any
}

const cache = new Map<string, LookupItem[]>()

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) return {}

  return {
    Authorization: `Bearer ${token}`,
  }
}

export function useLookup(source?: string) {
  const [items, setItems] = useState<LookupItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!source) return

    const lookupSource = source
    const config = CRUD_LOOKUPS[lookupSource]

    if (!config) {
      console.warn(`Lookup "${lookupSource}" non configurato`)
      return
    }

    async function load() {
      if (cache.has(lookupSource)) {
        setItems(cache.get(lookupSource)!)
        return
      }

      setLoading(true)

      try {
        const res = await fetch(config.endpoint, {
          headers: await getAuthHeaders(),
        })

        const json = await res.json()
        const data = json[config.responseKey] || []

        cache.set(lookupSource, data)
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