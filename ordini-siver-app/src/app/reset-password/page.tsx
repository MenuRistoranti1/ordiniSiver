"use client"

import { FormEvent, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confermaPassword, setConfermaPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [sessioneValida, setSessioneValida] = useState(false)
  const [messaggio, setMessaggio] = useState("")
  const [errore, setErrore] = useState("")

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        setSessioneValida(true)
        setPronto(true)
      }

      if (session?.user) {
        setSessioneValida(true)
        setPronto(true)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setSessioneValida(true)
      }

      setPronto(true)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function aggiornaPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrore("")
    setMessaggio("")

    if (password.length < 8) {
      setErrore("La password deve contenere almeno 8 caratteri.")
      return
    }

    if (password !== confermaPassword) {
      setErrore("Le password non coincidono.")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setErrore(error.message || "Errore durante l'aggiornamento della password.")
      setLoading(false)
      return
    }

    setMessaggio("Password aggiornata correttamente. Ora puoi effettuare il login admin.")

    await supabase.auth.signOut()

    setTimeout(() => {
      window.location.href = "/admin"
    }, 1500)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4 sm:p-12">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl sm:p-10">
        <h1 className="mb-2 text-4xl font-black text-slate-950 sm:text-5xl">
          Reset password
        </h1>

        <p className="mb-8 font-bold text-slate-500">
          Inserisci una nuova password per il tuo account amministratore.
        </p>

        {!pronto && (
          <div className="rounded-2xl bg-slate-100 p-4 font-bold text-slate-700">
            Verifico il link di recupero...
          </div>
        )}

        {pronto && !sessioneValida && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            Link non valido o scaduto. Richiedi una nuova email di recupero password da Supabase.
          </div>
        )}

        {pronto && sessioneValida && (
          <form onSubmit={aggiornaPassword}>
            <label className="mb-2 block font-black text-slate-800">
              Nuova password
            </label>

            <input
              type="password"
              autoComplete="new-password"
              placeholder="Nuova password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mb-5 w-full rounded-2xl border p-4 text-xl text-slate-900"
            />

            <label className="mb-2 block font-black text-slate-800">
              Conferma password
            </label>

            <input
              type="password"
              autoComplete="new-password"
              placeholder="Ripeti password"
              value={confermaPassword}
              onChange={(e) => setConfermaPassword(e.target.value)}
              required
              className="mb-5 w-full rounded-2xl border p-4 text-xl text-slate-900"
            />

            {errore && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
                {errore}
              </div>
            )}

            {messaggio && (
              <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 font-bold text-green-700">
                {messaggio}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 p-5 text-2xl font-black text-white disabled:bg-slate-400 sm:text-3xl"
            >
              {loading ? "Aggiorno..." : "Aggiorna password"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}