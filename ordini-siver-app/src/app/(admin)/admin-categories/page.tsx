"use client"

import { useEffect } from "react"
import { CrudModule } from "@/components/crud-engine"
import { useCategories } from "@/modules/categories/hooks"
import { getCategoriesConfig } from "@/modules/categories/config"

export default function AdminCategoriesPage() {
  const categories = useCategories()

  useEffect(() => {
    categories.caricaCategorie()
  }, [])

  const config = getCategoriesConfig(categories.statistiche)

  return (
    <CrudModule
      config={config}
      data={categories.categoriesFiltrate}
      loading={categories.loading}
      saving={categories.saving}
      searchValue={categories.ricerca}
      onSearchChange={categories.setRicerca}
      message={categories.messaggio}
      error={categories.errore}
      onCreate={(values) =>
        categories.creaCategoria({
          name: String(values.name || ""),
          active: Boolean(values.active),
        })
      }
      onUpdate={(id, values) =>
        categories.aggiornaCategoria(id, {
          name: String(values.name || ""),
          active: Boolean(values.active),
        })
      }
      onDelete={categories.eliminaCategoria}
    />
  )
}