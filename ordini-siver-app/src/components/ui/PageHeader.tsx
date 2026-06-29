import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
}

export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-black uppercase tracking-wide text-blue-600">
            {eyebrow}
          </p>
        )}

        <h1 className="text-3xl font-black tracking-tight text-slate-950">
          {title}
        </h1>

        {description && (
          <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}