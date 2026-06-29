import { CheckCircle2, Layers3, Package, XCircle } from "lucide-react"
import Badge from "@/components/ui/Badge"
import type { CrudModuleConfig } from "@/components/crud-engine"
import type { Product } from "./types"

export function getProductsConfig(statistiche: {
  totali: number
  attivi: number
  disattivati: number
  categorie: number
}): CrudModuleConfig<Product> {
  return {
    eyebrow: "Anagrafiche",
    title: "Prodotti V2",
    description: "Gestione anagrafica prodotti con nuovo motore CRUD.",
    createLabel: "Nuovo prodotto",
    getRowId: (row) => row.id,

    stats: [
      {
        label: "Prodotti",
        value: statistiche.totali,
        description: "Totali",
        icon: <Package className="h-6 w-6" />,
      },
      {
        label: "Attivi",
        value: statistiche.attivi,
        description: "Ordinabili",
        icon: <CheckCircle2 className="h-6 w-6" />,
      },
      {
        label: "Disattivati",
        value: statistiche.disattivati,
        description: "Non ordinabili",
        icon: <XCircle className="h-6 w-6" />,
      },
      {
        label: "Categorie",
        value: statistiche.categorie,
        description: "Presenti",
        icon: <Layers3 className="h-6 w-6" />,
      },
    ],

    columns: [
      {
        key: "name",
        label: "Prodotto",
        render: (row) => (
          <div>
            <div className="font-black text-slate-900">{row.name}</div>
            <div className="text-xs font-semibold text-slate-500">
              {row.supplier_code ? `Cod. ${row.supplier_code}` : "Senza codice"}
            </div>
          </div>
        ),
      },
      {
        key: "category_ref",
        label: "Categoria",
        render: (row) => row.category_ref?.name || "-",
      },
      {
        key: "unit_ref",
        label: "UM",
        render: (row) => row.unit_ref?.code || row.unit_ref?.description || "-",
      },
      {
        key: "price",
        label: "Prezzo",
        render: (row) =>
          row.price !== null && row.price !== undefined
            ? `${Number(row.price).toLocaleString("it-IT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} €`
            : "-",
      },
      {
        key: "active",
        label: "Stato",
        render: (row) =>
          row.active ? (
            <Badge variant="success">Attivo</Badge>
          ) : (
            <Badge variant="danger">Disattivato</Badge>
          ),
      },
    ],

    fields: [
      {
        name: "name",
        label: "Nome prodotto",
        type: "text",
        required: true,
        colSpan: 2,
      },
      {
        name: "supplier_code",
        label: "Codice fornitore",
        type: "text",
      },
      {
        name: "internal_code",
        label: "Codice interno",
        type: "text",
      },
      {
        name: "category_id",
        label: "Categoria",
        type: "select",
        source: "categories",
      },
      {
        name: "unit_id",
        label: "Unità di misura",
        type: "select",
        source: "units",
      },
      {
        name: "price",
        label: "Prezzo",
        type: "currency",
      },
      {
        name: "vat",
        label: "IVA",
        type: "number",
        defaultValue: "10",
      },
      {
        name: "active",
        label: "Prodotto attivo",
        type: "checkbox",
        defaultValue: true,
        colSpan: 2,
      },
      {
        name: "notes",
        label: "Note",
        type: "textarea",
        colSpan: 2,
      },
    ],
  }
}