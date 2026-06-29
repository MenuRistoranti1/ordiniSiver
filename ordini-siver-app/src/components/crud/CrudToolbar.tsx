import type { ReactNode } from "react"

type Props = {
  children?: ReactNode
  actions?: ReactNode
}

export default function CrudToolbar({ children, actions }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex-1">{children}</div>

      {actions && (
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}