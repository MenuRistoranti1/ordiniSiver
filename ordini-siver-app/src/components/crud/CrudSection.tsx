import type { ReactNode } from "react"

type Props = {
  children: ReactNode
  className?: string
}

export default function CrudSection({ children, className = "" }: Props) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  )
}