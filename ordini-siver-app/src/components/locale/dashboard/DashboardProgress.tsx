type DashboardProgressProps = {
  title: string
  subtitle: string
  percent: number
  color?: "blue" | "green" | "amber" | "red"
}

export function DashboardProgress({
  title,
  subtitle,
  percent,
  color = "blue",
}: DashboardProgressProps) {
  const value = Math.max(0, Math.min(100, percent))

  const colors = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    amber: "bg-amber-500",
    red: "bg-red-600",
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm font-bold text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="text-3xl font-black text-slate-900">
          {value}%
        </div>
      </div>

      <div className="h-4 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors[color]}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </section>
  )
}