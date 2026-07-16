import type { LucideIcon } from "lucide-react"

type DashboardKpiCardProps = {
  label: string
  value: string | number
  note: string
  icon: LucideIcon
  color: string
}

export function DashboardKpiCard({
  label,
  value,
  note,
  icon: Icon,
  color,
}: DashboardKpiCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <h2 className="mt-2 text-3xl font-black text-slate-950">
            {value}
          </h2>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {note}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}