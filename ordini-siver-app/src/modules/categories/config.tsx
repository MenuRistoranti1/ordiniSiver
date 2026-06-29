import { CheckCircle2, FolderTree, XCircle } from "lucide-react"
import Badge from "@/components/ui/Badge"
import type { CrudModuleConfig } from "@/components/crud-engine"
import type { Category } from "./types"

export function getCategoriesConfig(statistiche: {
  totali: number
  attive: number
  disattivate: number
}): CrudModuleConfig<Category> {
  return {
    eyebrow: "Anagrafiche",
    title: "Categorie",
    description: "Gestisci le categorie dei prodotti.",
    createLabel: "Nuova categoria",
    getRowId: (row) => row.id,

    stats: [
      {
        label: "Categorie",
        value: statistiche.totali,
        description: "Totali",
        icon: <FolderTree className="h-6 w-6" />,
      },
      {
        label: "Attive",
        value: statistiche.attive,
        description: "Utilizzabili",
        icon: <CheckCircle2 className="h-6 w-6" />,
      },
      {
        label: "Disattivate",
        value: statistiche.disattivate,
        description: "Non utilizzabili",
        icon: <XCircle className="h-6 w-6" />,
      },
    ],

    columns: [
      {
        key: "name",
        label: "Categoria",
        render: (row) => (
          <span className="font-black text-slate-900">{row.name}</span>
        ),
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
        name: "name",
        label: "Nome categoria",
        type: "text",
        required: true,
        colSpan: 2,
      },
      {
        name: "active",
        label: "Categoria attiva",
        type: "checkbox",
        defaultValue: true,
        colSpan: 2,
      },
    ],
  }
}