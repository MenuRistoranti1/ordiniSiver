"use client"

import { useMemo, useState } from "react"
import type {
  Locale,
  ModificaUtenteForm,
  NuovoUtenteForm,
  StatisticheUtenti,
  UtenteLocale,
} from "../types"

async function leggiJsonSicuro(res: Response) {
  const text = await res.text()

  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

export function useAdminUsers() {
  const [locali, setLocali] = useState<Locale[]>([])
  const [utenti, setUtenti] = useState<UtenteLocale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messaggio, setMessaggio] = useState("")
  const [errore, setErrore] = useState("")

  const [ricerca, setRicerca] = useState("")
  const [filtroLocale, setFiltroLocale] = useState("tutti")

  async function caricaDati() {
    setLoading(true)
    setErrore("")

    try {
      const res = await fetch("/api/admin/local-users", {
        cache: "no-store",
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore caricamento utenti")
      }

      setLocali(json.locali || [])
      setUtenti(json.utenti || [])
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  async function creaUtente(form: NuovoUtenteForm) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      const res = await fetch("/api/admin/local-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore creazione utente")
      }

      setMessaggio("Utente creato correttamente.")
      await caricaDati()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function aggiornaUtente(userId: string, form: ModificaUtenteForm) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      const res = await fetch(`/api/admin/local-users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore aggiornamento utente")
      }

      setMessaggio("Utente aggiornato correttamente.")
      await caricaDati()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function cambiaStato(userId: string, active: boolean) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      const res = await fetch(`/api/admin/local-users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active,
        }),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore aggiornamento stato")
      }

      setMessaggio(active ? "Utente attivato." : "Utente disattivato.")
      await caricaDati()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function resetPassword(userId: string, password: string) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      const res = await fetch(`/api/admin/local-users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore reset password")
      }

      setMessaggio("Password aggiornata correttamente.")
      await caricaDati()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function eliminaUtente(userId: string) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      const res = await fetch(`/api/admin/local-users/${userId}`, {
        method: "DELETE",
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore eliminazione utente")
      }

      setMessaggio("Utente eliminato correttamente.")
      await caricaDati()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  const utentiFiltrati = useMemo(() => {
    const q = ricerca.toLowerCase().trim()

    return utenti.filter((utente) => {
      const matchRicerca =
        !q ||
        [
          utente.nome,
          utente.cognome,
          utente.utente,
          utente.locale_nome,
          utente.email_interna,
        ]
          .filter(Boolean)
          .some((valore) => String(valore).toLowerCase().includes(q))

      const matchLocale =
        filtroLocale === "tutti" || utente.locale_id === filtroLocale

      return matchRicerca && matchLocale
    })
  }, [utenti, ricerca, filtroLocale])

  const statistiche: StatisticheUtenti = useMemo(() => {
    const attivi = utenti.filter((u) => u.active).length
    const disattivati = utenti.filter((u) => !u.active).length
    const localiCoperti = new Set(
      utenti.filter((u) => u.locale_id).map((u) => u.locale_id)
    ).size

    return {
      totali: utenti.length,
      attivi,
      disattivati,
      localiCoperti,
    }
  }, [utenti])

  return {
    locali,
    utenti,
    utentiFiltrati,
    statistiche,
    loading,
    saving,
    messaggio,
    errore,
    ricerca,
    setRicerca,
    filtroLocale,
    setFiltroLocale,
    caricaDati,
    creaUtente,
    aggiornaUtente,
    cambiaStato,
    resetPassword,
    eliminaUtente,
  }
}