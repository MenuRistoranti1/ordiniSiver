"use client"

import { useEffect } from "react"
import CrudModule from "./CrudModule"
import { modules, type ModuleKey } from "@/modules"

type Props = {
  moduleKey: ModuleKey
}

export default function CrudModuleByKey({ moduleKey }: Props) {
  const module = modules[moduleKey]
  const crud: any = module.useHook()

  useEffect(() => {
    if (crud.caricaCategorie) crud.caricaCategorie()
    if (crud.caricaUnita) crud.caricaUnita()
    if (crud.caricaProdotti) crud.caricaProdotti()
  }, [])

  const config: any = module.getConfig(crud.statistiche)

  const data =
    crud.categoriesFiltrate ||
    crud.unitsFiltrate ||
    crud.productsFiltrati ||
    []

  const creaKey = Object.keys(crud).find((k) => k.startsWith("crea"))
  const aggiornaKey = Object.keys(crud).find((k) => k.startsWith("aggiorna"))
  const eliminaKey = Object.keys(crud).find((k) => k.startsWith("elimina"))

  return (
    <CrudModule
      config={config}
      data={data}
      loading={crud.loading}
      saving={crud.saving}
      searchValue={crud.ricerca}
      onSearchChange={crud.setRicerca}
      message={crud.messaggio}
      error={crud.errore}
      onCreate={(values) =>
        creaKey ? crud[creaKey](module.mapCreate(values)) : false
      }
      onUpdate={(id, values) =>
        aggiornaKey ? crud[aggiornaKey](id, module.mapUpdate(values)) : false
      }
      onDelete={(id) => (eliminaKey ? crud[eliminaKey](id) : false)}
    />
  )
}