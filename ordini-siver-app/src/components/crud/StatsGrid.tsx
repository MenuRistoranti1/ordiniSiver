import type { ReactNode } from "react"
import StatCard from "@/components/ui/StatCard"

type StatItem = {
  label: string
  value: string | number
  description?: string
  icon?: ReactNode
}

type Props = {
  items: StatItem[]
}

export default function StatsGrid({ items }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <StatCard
          key={item.label}
          label={item.label}
          value={item.value}
          description={item.description}
          icon={item.icon}
        />
      ))}
    </div>
  )
}