"use client"

import { useEffect } from "react"
import { CrudModule } from "@/components/crud-engine"
import { useUnits } from "@/modules/units/hooks"
import { getUnitsConfig } from "@/modules/units/config"

export default function AdminUnitsPage() {
  const units = useUnits()

  useEffect(() => {
    units.caricaUnita()
  }, [])

  const config = getUnitsConfig(units.statistiche)

  return (
    <CrudModule
      config={config}
      data={units.unitsFiltrate}
      loading={units.loading}
      saving={units.saving}
      searchValue={units.ricerca}
      onSearchChange={units.setRicerca}
      message={units.messaggio}
      error={units.errore}
      onCreate={(values) =>
        units.creaUnita({
          code: String(values.code || ""),
          description: String(values.description || ""),
          active: Boolean(values.active),
        })
      }
      onUpdate={(id, values) =>
        units.aggiornaUnita(id, {
          code: String(values.code || ""),
          description: String(values.description || ""),
          active: Boolean(values.active),
        })
      }
      onDelete={units.eliminaUnita}
    />
  )
}