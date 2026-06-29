import { CheckCircle2, Store, UserX, Users } from "lucide-react"
import StatCard from "@/components/ui/StatCard"
import type { StatisticheUtenti } from "../types"

type Props = {
  statistiche: StatisticheUtenti
}

export default function UsersStats({ statistiche }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Utenti totali"
        value={statistiche.totali}
        description="Account locali creati"
        icon={<Users className="h-6 w-6" />}
      />

      <StatCard
        label="Attivi"
        value={statistiche.attivi}
        description="Possono accedere"
        icon={<CheckCircle2 className="h-6 w-6" />}
      />

      <StatCard
        label="Disattivati"
        value={statistiche.disattivati}
        description="Accesso bloccato"
        icon={<UserX className="h-6 w-6" />}
      />

      <StatCard
        label="Locali coperti"
        value={statistiche.localiCoperti}
        description="Locali con almeno un utente"
        icon={<Store className="h-6 w-6" />}
      />
    </div>
  )
}