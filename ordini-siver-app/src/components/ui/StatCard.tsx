import type { ReactNode } from "react"

type StatCardProps = {
  label: string
  value: string | number
  description?: string
  icon?: ReactNode
}

export default function StatCard({
  label,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {description}
            </p>
          )}
        </div>

        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}