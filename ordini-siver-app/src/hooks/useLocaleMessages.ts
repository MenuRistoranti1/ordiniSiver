"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/Toast"
import {
  caricaMessaggiLocale,
  inviaMessaggioLocale,
  segnaMessaggiAdminComeLetti,
} from "@/services/messages.service"
import type { LocaleMessage } from "@/types/messages"

export function useLocaleMessages() {
  const { showToast } = useToast()

  const [messaggi, setMessaggi] = useState<LocaleMessage[]>([])
  const [testo, setTesto] = useState("")
  const [nomeMittente, setNomeMittente] = useState("")
  const [localeId, setLocaleId] = useState("")
  const [localeNome, setLocaleNome] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    void inizializzaPagina()
  }, [])

  async function inizializzaPagina() {
    setLoading(true)

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        window.location.href = "/"
        return
      }

      if (user.app_metadata?.role !== "locale") {
        await supabase.auth.signOut()
        window.location.href = "/"
        return
      }

      const id =
        localStorage.getItem("locale_id") ||
        String(user.app_metadata?.locale_id || "")

      const nome =
        localStorage.getItem("locale_nome") ||
        String(user.app_metadata?.locale_nome || "")

      if (!id || !nome) {
        await supabase.auth.signOut()
        window.location.href = "/"
        return
      }

      setLocaleId(id)
      setLocaleNome(nome)

      await aggiornaMessaggi(id, false)
    } catch (error) {
      console.error("Errore inizializzazione messaggi:", error)
      showToast("Errore durante il caricamento dei messaggi", "error")
    } finally {
      setLoading(false)
    }
  }

  async function aggiornaMessaggi(
    id = localeId,
    mostraMessaggio = true,
  ) {
    if (!id) return

    setLoading(true)

    try {
      const data = await caricaMessaggiLocale(id)
      setMessaggi(data)

      await segnaMessaggiAdminComeLetti(id)

      if (mostraMessaggio) {
        showToast("Messaggi aggiornati", "success")
      }
    } catch (error) {
      console.error("Errore caricamento messaggi:", error)
      showToast("Errore durante il caricamento dei messaggi", "error")
    } finally {
      setLoading(false)
    }
  }

  async function inviaMessaggio() {
    if (sending) return

    if (!localeId || !localeNome) {
      showToast("Sessione locale non valida", "error")
      return
    }

    if (!nomeMittente.trim()) {
      showToast("Inserisci il nome di chi scrive", "warning")
      return
    }

    if (!testo.trim()) {
      showToast("Scrivi un messaggio", "warning")
      return
    }

    setSending(true)

    try {
      await inviaMessaggioLocale({
        localeId,
        localeNome,
        nomeMittente,
        message: testo,
      })

      setTesto("")
      await aggiornaMessaggi(localeId, false)
      showToast("Messaggio inviato", "success")
    } catch (error) {
      console.error("Errore invio messaggio:", error)
      showToast("Errore durante l'invio del messaggio", "error")
    } finally {
      setSending(false)
    }
  }

  return {
    messaggi,
    testo,
    setTesto,
    nomeMittente,
    setNomeMittente,
    localeId,
    localeNome,
    loading,
    sending,
    aggiornaMessaggi,
    inviaMessaggio,
  }
}