"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Locale = {
  id: string
  name: string
}

type UtenteLocale = {
  id: string
  nome: string
  cognome: string
  utente: string
  email_interna?: string
  locale_id: string | null
  locale_nome: string | null
  active: boolean
  created_at: string
}

export default function AdminUtentiPage() {
  const [locali, setLocali] = useState<Locale[]>([])
  const [utenti, setUtenti] = useState<UtenteLocale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messaggio, setMessaggio] = useState("")
  const [errore, setErrore] = useState("")
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null)
  const [nuovaPassword, setNuovaPassword] = useState("")
  const [resetSaving, setResetSaving] = useState(false)

  const [form, setForm] = useState({
    nome: "",
    cognome: "",
    utente: "",
    password: "",
    locale_id: "",
  })

  async function leggiJsonSicuro(res: Response) {
    const text = await res.text()
    if (!text) return {}

    try {
      return JSON.parse(text)
    } catch {
      return { error: text }
    }
  }

  async function caricaDati() {
    setLoading(true)
    setErrore("")

    try {
      const res = await fetch("/api/admin/local-users", { cache: "no-store" })
      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore caricamento dati")
      }

      setLocali(json.locali || [])
      setUtenti(json.utenti || [])
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    caricaDati()
  }, [])

  async function creaUtente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessaggio("")
    setErrore("")

    try {
      const res = await fetch("/api/admin/local-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore creazione utente")
      }

      setMessaggio("Utente creato correttamente.")
      setForm({
        nome: "",
        cognome: "",
        utente: "",
        password: "",
        locale_id: "",
      })

      await caricaDati()
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
    } finally {
      setSaving(false)
    }
  }

  async function aggiornaLocale(userId: string, localeId: string) {
    setErrore("")
    setMessaggio("")

    try {
      const res = await fetch(`/api/admin/local-users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale_id: localeId,
        }),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore aggiornamento locale")
      }

      setMessaggio("Locale aggiornato correttamente.")
      await caricaDati()
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
    }
  }

  async function cambiaStato(userId: string, active: boolean) {
    setErrore("")
    setMessaggio("")

    try {
      const res = await fetch(`/api/admin/local-users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active,
        }),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore aggiornamento stato")
      }

      setMessaggio(active ? "Utente attivato." : "Utente disattivato.")
      await caricaDati()
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
    }
  }

  async function resetPassword(userId: string) {
    setErrore("")
    setMessaggio("")

    if (!nuovaPassword.trim()) {
      setErrore("Inserisci la nuova password.")
      return
    }

    if (nuovaPassword.trim().length < 6) {
      setErrore("La password deve avere almeno 6 caratteri.")
      return
    }

    setResetSaving(true)

    try {
      const res = await fetch(`/api/admin/local-users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: nuovaPassword.trim(),
        }),
      })

      const json = await leggiJsonSicuro(res)

      if (!res.ok) {
        throw new Error(json.error || "Errore reset password")
      }

      setMessaggio("Password aggiornata correttamente.")
      setResetPasswordId(null)
      setNuovaPassword("")
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore imprevisto")
    } finally {
      setResetSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Gestione utenti locali
          </h1>
          <p className="mt-1 text-slate-500">
            Crea utenti, assegna locale, modifica accessi e resetta password.
          </p>
        </div>

        <Link
          href="/admin-dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
        >
          Torna alla dashboard
        </Link>
      </div>

      {messaggio && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {messaggio}
        </div>
      )}

      {errore && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {errore}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-bold text-slate-900">
          Crea nuovo utente
        </h2>

        <form
          onSubmit={creaUtente}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
        >
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            required
          />

          <input
            value={form.cognome}
            onChange={(e) => setForm({ ...form, cognome: e.target.value })}
            placeholder="Cognome"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            required
          />

          <input
            value={form.utente}
            onChange={(e) => setForm({ ...form, utente: e.target.value })}
            placeholder="Utente"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            required
          />

          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Password"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            required
          />

          <select
            value={form.locale_id}
            onChange={(e) => setForm({ ...form, locale_id: e.target.value })}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            required
          >
            <option value="">Seleziona locale</option>
            {locali.map((locale) => (
              <option key={locale.id} value={locale.id}>
                {locale.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60 md:col-span-2 xl:col-span-5"
          >
            {saving ? "Creazione in corso..." : "Crea utente"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900">Utenti creati</h2>
        </div>

        {loading ? (
          <div className="p-6 text-slate-500">Caricamento utenti...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left">Nome</th>
                  <th className="px-6 py-4 text-left">Cognome</th>
                  <th className="px-6 py-4 text-left">Utente</th>
                  <th className="px-6 py-4 text-left">Locale</th>
                  <th className="px-6 py-4 text-left">Stato</th>
                  <th className="px-6 py-4 text-left">Azioni</th>
                </tr>
              </thead>

              <tbody>
                {utenti.map((utente) => (
                  <tr key={utente.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-semibold">{utente.nome}</td>
                    <td className="px-6 py-4">{utente.cognome}</td>
                    <td className="px-6 py-4">{utente.utente}</td>

                    <td className="px-6 py-4">
                      <select
                        value={utente.locale_id || ""}
                        onChange={(e) =>
                          aggiornaLocale(utente.id, e.target.value)
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                      >
                        <option value="">Nessun locale</option>
                        {locali.map((locale) => (
                          <option key={locale.id} value={locale.id}>
                            {locale.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          utente.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {utente.active ? "Attivo" : "Disattivato"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => cambiaStato(utente.id, !utente.active)}
                          className={`rounded-lg px-4 py-2 font-semibold text-white ${
                            utente.active
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {utente.active ? "Disattiva" : "Attiva"}
                        </button>

                        <button
                          onClick={() => {
                            setResetPasswordId(
                              resetPasswordId === utente.id ? null : utente.id
                            )
                            setNuovaPassword("")
                          }}
                          className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                        >
                          Reset password
                        </button>

                        {resetPasswordId === utente.id && (
                          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <input
                              type="password"
                              value={nuovaPassword}
                              onChange={(e) =>
                                setNuovaPassword(e.target.value)
                              }
                              placeholder="Nuova password"
                              className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                            />

                            <div className="flex gap-2">
                              <button
                                onClick={() => resetPassword(utente.id)}
                                disabled={resetSaving}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                              >
                                {resetSaving ? "Salvo..." : "Salva"}
                              </button>

                              <button
                                onClick={() => {
                                  setResetPasswordId(null)
                                  setNuovaPassword("")
                                }}
                                className="rounded-lg bg-slate-300 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-400"
                              >
                                Annulla
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {utenti.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      Nessun utente locale creato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}