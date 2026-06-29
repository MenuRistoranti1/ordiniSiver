import { Inbox } from "lucide-react"

type EmptyStateProps = {
  title: string
  description?: string
}

export default function EmptyState({
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Inbox className="h-8 w-8 text-slate-500" />
      </div>

      <h3 className="text-lg font-black text-slate-900">
        {title}
      </h3>

      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">
          {description}
        </p>
      )}
    </div>
  )
}