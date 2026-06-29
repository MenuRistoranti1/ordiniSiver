"use client"

import { useEffect, useState } from "react"
import Modal from "@/components/ui/Modal"
import type { Locale, ModificaUtenteForm, UtenteLocale } from "../types"

type Props = {
  utente: UtenteLocale | null
  locali: Locale[]
  loading: boolean
  onClose: () => void
  onSave: (id: string, form: ModificaUtenteForm) => Promise<boolean>
}

export default function EditUserModal({
  utente,
  locali,
  loading,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ModificaUtenteForm>({
    nome: "",
    cognome: "",
    utente: "",
    locale_id: "",
    active: true,
  })

  useEffect(() => {
    if (!utente) return

    setForm({
      nome: utente.nome || "",
      cognome: utente.cognome || "",
      utente: utente.utente || "",
      locale_id: utente.locale_id || "",
      active: Boolean(utente.active),
    })
  }, [utente])

  async function salva() {
    if (!utente) return

    const ok = await onSave(utente.id, form)

    if (ok) {
      onClose()
    }
  }

  return (
    <Modal
      open={!!utente}
      title="Modifica utente"
      description={
        utente
          ? `${utente.nome} ${utente.cognome} · @${utente.utente}`
          : undefined
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
          />

          <input
            value={form.cognome}
            onChange={(e) => setForm({ ...form, cognome: e.target.value })}
            placeholder="Cognome"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
          />
        </div>

        <input
          value={form.utente}
          onChange={(e) => setForm({ ...form, utente: e.target.value })}
          placeholder="Username"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
        />

        <select
          value={form.locale_id}
          onChange={(e) => setForm({ ...form, locale_id: e.target.value })}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
        >
          <option value="">Nessun locale</option>
          {locali.map((locale) => (
            <option key={locale.id} value={locale.id}>
              {locale.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-sm font-bold text-slate-700">
            Utente attivo
          </span>
        </label>

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
            {loading ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </Modal>
  )
}