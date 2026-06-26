"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type StatoLocale = "loading" | "ok" | "error"

export function useLocale() {
  const [stato, setStato] = useState<StatoLocale>("loading")
  const [localeId, setLocaleId] = useState("")
  const [localeNome, setLocaleNome] = useState("")
  const [userId, setUserId] = useState("")

  useEffect(() => {
    caricaLocale()
  }, [])

  async function caricaLocale() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      setStato("error")
      window.location.href = "/"
      return
    }

    if (user.app_metadata?.role !== "locale") {
      await supabase.auth.signOut()
      setStato("error")
      window.location.href = "/"
      return
    }

    const id = String(user.app_metadata?.locale_id || "")
    const nome = String(user.app_metadata?.locale_nome || "")

    if (!id || !nome) {
      await supabase.auth.signOut()
      setStato("error")
      window.location.href = "/"
      return
    }

    setUserId(user.id)
    setLocaleId(id)
    setLocaleNome(nome)
    setStato("ok")
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return {
    stato,
    loading: stato === "loading",
    ok: stato === "ok",
    localeId,
    localeNome,
    userId,
    logout,
  }
}