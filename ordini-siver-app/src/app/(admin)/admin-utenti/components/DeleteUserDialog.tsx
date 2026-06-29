"use client"

import ConfirmDialog from "@/components/ui/ConfirmDialog"
import type { UtenteLocale } from "../types"

type Props = {
  utente: UtenteLocale | null
  loading: boolean
  onClose: () => void
  onConfirm: (id: string) => Promise<boolean>
}

export default function DeleteUserDialog({
  utente,
  loading,
  onClose,
  onConfirm,
}: Props) {
  async function elimina() {
    if (!utente) return

    const ok = await onConfirm(utente.id)

    if (ok) {
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open={!!utente}
      title="Eliminare utente?"
      description={
        utente
          ? `Stai eliminando ${utente.nome} ${utente.cognome}. L'accesso verrà rimosso definitivamente.`
          : ""
      }
      confirmText="Elimina"
      cancelText="Annulla"
      loading={loading}
      onConfirm={elimina}
      onCancel={onClose}
    />
  )
}