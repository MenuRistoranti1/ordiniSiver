import { CheckCircle2, Layers3, Package, XCircle } from "lucide-react"
import StatCard from "@/components/ui/StatCard"
import type { ProductStats } from "../types"

type Props = {
  statistiche: ProductStats
}

export default function ProductsStats({ statistiche }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Prodotti totali"
        value={statistiche.totali}
        description="Anagrafica prodotti"
        icon={<Package className="h-6 w-6" />}
      />

      <StatCard
        label="Attivi"
        value={statistiche.attivi}
        description="Disponibili per ordini"
        icon={<CheckCircle2 className="h-6 w-6" />}
      />

      <StatCard
        label="Disattivati"
        value={statistiche.disattivati}
        description="Non ordinabili"
        icon={<XCircle className="h-6 w-6" />}
      />

      <StatCard
        label="Categorie"
        value={statistiche.categorie}
        description="Categorie presenti"
        icon={<Layers3 className="h-6 w-6" />}
      />
    </div>
  )
}