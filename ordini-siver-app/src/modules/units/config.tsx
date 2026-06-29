import { CheckCircle2, Ruler, XCircle } from "lucide-react"
import Badge from "@/components/ui/Badge"
import type { CrudModuleConfig } from "@/components/crud-engine"
import type { Unit } from "./types"

export function getUnitsConfig(statistiche: {
  totali: number
  attive: number
  disattivate: number
}): CrudModuleConfig<Unit> {
  return {
    eyebrow: "Anagrafiche",
    title: "Unità di misura",
    description: "Gestione unità di misura.",
    createLabel: "Nuova unità",
    getRowId: (row) => row.id,

    stats: [
      {
        label: "Totali",
        value: statistiche.totali,
        icon: <Ruler className="h-6 w-6" />,
      },
      {
        label: "Attive",
        value: statistiche.attive,
        icon: <CheckCircle2 className="h-6 w-6" />,
      },
      {
        label: "Disattivate",
        value: statistiche.disattivate,
        icon: <XCircle className="h-6 w-6" />,
      },
    ],

    columns: [
      {
        key: "code",
        label: "Codice",
      },
      {
        key: "description",
        label: "Descrizione",
      },
      {
        key: "active",
        label: "Stato",
        render: (row) =>
          row.active ? (
            <Badge variant="success">Attiva</Badge>
          ) : (
            <Badge variant="danger">Disattivata</Badge>
          ),
      },
    ],

    fields: [
      {
        name: "code",
        label: "Codice",
        type: "text",
        required: true,
      },
      {
        name: "description",
        label: "Descrizione",
        type: "text",
      },
      {
        name: "active",
        label: "Attiva",
        type: "checkbox",
        defaultValue: true,
        colSpan: 2,
      },
    ],
  }
}