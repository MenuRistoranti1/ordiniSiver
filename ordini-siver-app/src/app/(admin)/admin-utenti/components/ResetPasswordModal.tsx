"use client"

import { useEffect, useState } from "react"
import Modal from "@/components/ui/Modal"
import type { UtenteLocale } from "../types"

type Props = {
  utente: UtenteLocale | null
  loading: boolean
  onClose: () => void
  onSave: (id: string, password: string) => Promise<boolean>
}

export default function ResetPasswordModal({
  utente,
  loading,
  onClose,
  onSave,
}: Props) {
  const [password, setPassword] = useState("")
  const [conferma, setConferma] = useState("")
  const [errore, setErrore] = useState("")

  useEffect(() => {
    if (!utente) return

    setPassword("")
    setConferma("")
    setErrore("")
  }, [utente])

  async function salva() {
    if (!utente) return

    setErrore("")

    if (!password.trim()) {
      setErrore("Inserisci la nuova password.")
      return
    }

    if (password.trim().length < 6) {
      setErrore("La password deve avere almeno 6 caratteri.")
      return
    }

    if (password !== conferma) {
      setErrore("Le password non coincidono.")
      return
    }

    const ok = await onSave(utente.id, password.trim())

    if (ok) {
      onClose()
    }
  }

  return (
    <Modal
      open={!!utente}
      title="Reset password"
      description={
        utente
          ? `${utente.nome} ${utente.cognome} · @${utente.utente}`
          : undefined
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {errore && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errore}
          </div>
        )}

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nuova password"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
        />

        <input
          type="password"
          value={conferma}
          onChange={(e) => setConferma(e.target.value)}
          placeholder="Conferma password"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
        />

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-300 px-5 py-2 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Annulla
          </button>

          <button
            onClick={salva}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Salvataggio..." : "Salva password"}
          </button>
        </div>
      </div>
    </Modal>
  )
}