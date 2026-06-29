"use client"

import { useEffect, useState } from "react"
import CrudFormModal from "@/components/crud/CrudFormModal"
import type { Locale, NuovoUtenteForm } from "../types"

type Props = {
  open: boolean
  locali: Locale[]
  loading: boolean
  onClose: () => void
  onCreate: (form: NuovoUtenteForm) => Promise<boolean>
}

const initialForm: NuovoUtenteForm = {
  nome: "",
  cognome: "",
  utente: "",
  password: "",
  locale_id: "",
}

export default function UserCreateForm({
  open,
  locali,
  loading,
  onClose,
  onCreate,
}: Props) {
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    if (open) {
      setForm(initialForm)
    }
  }, [open])

  async function submit() {
    const ok = await onCreate(form)

    if (ok) {
      onClose()
    }
  }

  return (
    <CrudFormModal
      open={open}
      title="Nuovo utente"
      description="Crea un nuovo accesso per un locale."
      loading={loading}
      submitLabel="Crea utente"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input
          placeholder="Nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
        />

        <input
          placeholder="Cognome"
          value={form.cognome}
          onChange={(e) => setForm({ ...form, cognome: e.target.value })}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
        />
      </div>

      <input
        placeholder="Username"
        value={form.utente}
        onChange={(e) => setForm({ ...form, utente: e.target.value })}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
      />

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
      />

      <select
        value={form.locale_id}
        onChange={(e) => setForm({ ...form, locale_id: e.target.value })}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
      >
        <option value="">Seleziona locale</option>
        {locali.map((locale) => (
          <option key={locale.id} value={locale.id}>
            {locale.name}
          </option>
        ))}
      </select>
    </CrudFormModal>
  )
}