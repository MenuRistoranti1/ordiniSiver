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
    locali_assegnati: [],
  })

  useEffect(() => {
    if (!utente) return

    const assegnati =
      utente.locali_assegnati && utente.locali_assegnati.length > 0
        ? utente.locali_assegnati
        : utente.locale_id
          ? [utente.locale_id]
          : []

    setForm({
      nome: utente.nome || "",
      cognome: utente.cognome || "",
      utente: utente.utente || "",
      locale_id: utente.locale_id || assegnati[0] || "",
      active: Boolean(utente.active),
      locali_assegnati: assegnati,
    })
  }, [utente])

  function toggleLocale(localeId: string) {
    const presente = form.locali_assegnati.includes(localeId)

    const nuovi = presente
      ? form.locali_assegnati.filter((id) => id !== localeId)
      : [...form.locali_assegnati, localeId]

    setForm({
      ...form,
      locali_assegnati: nuovi,
      locale_id: nuovi.includes(form.locale_id)
        ? form.locale_id
        : nuovi[0] || "",
    })
  }

  async function salva() {
    if (!utente) return

    const localePrincipale =
      form.locale_id || form.locali_assegnati[0] || ""

    const ok = await onSave(utente.id, {
      ...form,
      locale_id: localePrincipale,
      locali_assegnati: form.locali_assegnati,
    })

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

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">
              Locali assegnati
            </h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Puoi assegnare lo stesso utente a uno o più locali.
            </p>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {locali.map((locale) => {
              const checked = form.locali_assegnati.includes(locale.id)
              const principale = form.locale_id === locale.id

              return (
                <div
                  key={locale.id}
                  className={`rounded-xl border p-3 ${
                    checked
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLocale(locale.id)}
                      className="h-4 w-4"
                    />

                    <span className="flex-1 text-sm font-black text-slate-800">
                      {locale.name}
                    </span>
                  </label>

                  {checked && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, locale_id: locale.id })
                      }
                      className={`mt-2 rounded-lg px-3 py-1.5 text-xs font-black ${
                        principale
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-700 ring-1 ring-slate-200"
                      }`}
                    >
                      {principale
                        ? "Locale principale"
                        : "Imposta come principale"}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

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