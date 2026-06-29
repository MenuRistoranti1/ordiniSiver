"use client"

import type { ReactNode } from "react"
import Modal from "@/components/ui/Modal"

type Props = {
  open: boolean
  title: string
  description?: string
  loading?: boolean
  submitLabel?: string
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
}

export default function CrudFormModal({
  open,
  title,
  description,
  loading = false,
  submitLabel = "Salva",
  onClose,
  onSubmit,
  children,
}: Props) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
    >
      <div className="space-y-5">

        {children}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-300 px-5 py-2 font-bold"
          >
            Annulla
          </button>

          <button
            onClick={onSubmit}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white"
          >
            {loading ? "Salvataggio..." : submitLabel}
          </button>
        </div>

      </div>
    </Modal>
  )
}