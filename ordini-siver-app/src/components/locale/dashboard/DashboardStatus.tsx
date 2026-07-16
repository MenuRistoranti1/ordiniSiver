import type { LucideIcon } from "lucide-react"

type DashboardStatusProps = {
  title: string
  text: string
  className: string
  icon: LucideIcon
  showAction?: boolean
  actionLabel?: string
  onAction?: () => void
}

export function DashboardStatus({
  title,
  text,
  className,
  icon: Icon,
  showAction = false,
  actionLabel = "Apri",
  onAction,
}: DashboardStatusProps) {
  return (
    <section className={`rounded-3xl border p-4 shadow-sm ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/70 p-2">
            <Icon className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-lg font-black">{title}</h2>

            <p className="mt-1 text-sm font-bold">
              {text}
            </p>
          </div>
        </div>

        {showAction && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-700"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  )
}