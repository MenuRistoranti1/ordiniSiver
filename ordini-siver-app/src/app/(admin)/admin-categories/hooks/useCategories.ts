"use client"

import { useMemo, useState } from "react"
import { CategoriesService } from "@/services/categories.service"
import type { Category, CategoryForm, CategoryStats } from "../types"

const emptyForm: CategoryForm = {
  name: "",
  active: true,
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messaggio, setMessaggio] = useState("")
  const [errore, setErrore] = useState("")
  const [ricerca, setRicerca] = useState("")
  const [filtroStato, setFiltroStato] = useState("tutte")

  async function caricaCategorie() {
    setLoading(true)
    setErrore("")

    try {
      const data = await CategoriesService.getAll()
      setCategories(data)
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  async function creaCategoria(form: CategoryForm) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      await CategoriesService.create(form)
      setMessaggio("Categoria creata correttamente.")
      await caricaCategorie()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function aggiornaCategoria(id: string, form: CategoryForm) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      await CategoriesService.update(id, form)
      setMessaggio("Categoria aggiornata correttamente.")
      await caricaCategorie()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function eliminaCategoria(id: string) {
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      await CategoriesService.delete(id)
      setMessaggio("Categoria disattivata correttamente.")
      await caricaCategorie()
      return true
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
      return false
    } finally {
      setSaving(false)
    }
  }

  const categoriesFiltrate = useMemo(() => {
    const q = ricerca.toLowerCase().trim()

    return categories.filter((category) => {
      const matchRicerca = !q || category.name.toLowerCase().includes(q)

      const matchStato =
        filtroStato === "tutte" ||
        (filtroStato === "attive" && category.active) ||
        (filtroStato === "disattivate" && !category.active)

      return matchRicerca && matchStato
    })
  }, [categories, ricerca, filtroStato])

  const statistiche: CategoryStats = useMemo(() => {
    const attive = categories.filter((c) => c.active).length
    const disattivate = categories.filter((c) => !c.active).length

    return {
      totali: categories.length,
      attive,
      disattivate,
    }
  }, [categories])

  return {
    categories,
    categoriesFiltrate,
    statistiche,
    loading,
    saving,
    messaggio,
    errore,
    ricerca,
    setRicerca,
    filtroStato,
    setFiltroStato,
    emptyForm,
    caricaCategorie,
    creaCategoria,
    aggiornaCategoria,
    eliminaCategoria,
  }
}