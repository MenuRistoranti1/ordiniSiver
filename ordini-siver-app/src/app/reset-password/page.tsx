
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [conferma, setConferma] = useState("")
  const [ready, setReady] = useState(false)
  const [errore, setErrore] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        setReady(true)
      }
    }

    checkSession()
  }, [])

  async function updatePassword() {
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

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    })

    if (error) {
      setErrore(error.message)
      setLoading(false)
      return
    }

    alert("Password aggiornata correttamente.")
    await supabase.auth.signOut()
    window.location.href = "/admin"
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Link non valido
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Il link di reset non è valido o è scaduto. Richiedi nuovamente il
            reset password dalla pagina admin.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Reset Password
        </h1>

        <p className="mb-6 text-sm text-slate-500">
          Inserisci e conferma la nuova password.
        </p>

        {errore && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errore}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="password"
            placeholder="Nuova password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="password"
            placeholder="Conferma password"
            value={conferma}
            onChange={(e) => setConferma(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={updatePassword}
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Aggiornamento..." : "Aggiorna password"}
          </button>
        </div>
      </div>
    </main>
  )
}