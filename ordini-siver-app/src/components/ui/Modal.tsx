import type { ReactNode } from "react"
import { X } from "lucide-react"

type ModalProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
}

export default function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}