"use client"

import Modal from "./Modal"

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Conferma",
  cancelText = "Annulla",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
    >
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="rounded-xl border border-slate-300 px-5 py-2 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {cancelText}
        </button>

        <button
          onClick={onConfirm}
          disabled={loading}
          className="rounded-xl bg-red-600 px-5 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Attendere..." : confirmText}
        </button>
      </div>
    </Modal>
  )
}