"use client"

import { useMemo } from "react"
import { useCrud } from "@/core/crud/useCrud"
import { CategoriesRepository } from "./repository"
import type { Category, CategoryForm, CategoryStats } from "./types"

export function useCategories() {
  const crud = useCrud<Category, CategoryForm>(CategoriesRepository, {
    searchFields: ["name"],
    messages: {
      created: "Categoria creata correttamente.",
      updated: "Categoria aggiornata correttamente.",
      removed: "Categoria disattivata correttamente.",
    },
  })

  const statistiche: CategoryStats = useMemo(() => {
    const attive = crud.items.filter((c) => c.active).length
    const disattivate = crud.items.filter((c) => !c.active).length

    return {
      totali: crud.items.length,
      attive,
      disattivate,
    }
  }, [crud.items])

  return {
    categories: crud.items,
    categoriesFiltrate: crud.filteredItems,
    statistiche,
    loading: crud.loading,
    saving: crud.saving,
    messaggio: crud.message,
    errore: crud.error,
    ricerca: crud.search,
    setRicerca: crud.setSearch,
    caricaCategorie: crud.load,
    creaCategoria: crud.create,
    aggiornaCategoria: crud.update,
    eliminaCategoria: crud.remove,
  }
}