"use client"

import { useMemo, useState } from "react"
import { UnitsService } from "./service"
import type { Unit, UnitForm, UnitStats } from "./types"

const emptyForm: UnitForm = {
  code: "",
  description: "",
  active: true,
}

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messaggio, setMessaggio] = useState("")
  const [errore, setErrore] = useState("")
  const [ricerca, setRicerca] = useState("")

  async function caricaUnita() {
    setLoading(true)
    setErrore("")

    try {
      const data = await UnitsService.getAll()
      setUnits(data)
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  async function creaUnita(form: UnitForm) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      await UnitsService.create(form)
      setMessaggio("Unità creata.")
      await caricaUnita()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function aggiornaUnita(id: string, form: UnitForm) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      await UnitsService.update(id, form)
      setMessaggio("Unità aggiornata.")
      await caricaUnita()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function eliminaUnita(id: string) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      await UnitsService.delete(id)
      setMessaggio("Unità eliminata.")
      await caricaUnita()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  const unitsFiltrate = useMemo(() => {
    const q = ricerca.toLowerCase().trim()

    return units.filter((u) =>
      [u.code, u.description]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [units, ricerca])

  const statistiche: UnitStats = useMemo(() => {
    const attive = units.filter((u) => u.active).length

    return {
      totali: units.length,
      attive,
      disattivate: units.length - attive,
    }
  }, [units])

  return {
    units,
    unitsFiltrate,
    statistiche,
    loading,
    saving,
    messaggio,
    errore,
    ricerca,
    setRicerca,
    emptyForm,
    caricaUnita,
    creaUnita,
    aggiornaUnita,
    eliminaUnita,
  }
}