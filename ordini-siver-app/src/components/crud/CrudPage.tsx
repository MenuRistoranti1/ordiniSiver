import type { ReactNode } from "react"
import PageHeader from "@/components/ui/PageHeader"

type Props = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  children: ReactNode
}

export default function CrudPage({
  title,
  description,
  eyebrow,
  actions,
  children,
}: Props) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />

      {children}
    </div>
  )
}