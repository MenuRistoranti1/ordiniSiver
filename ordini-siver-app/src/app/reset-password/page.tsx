"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      console.log("SESSION:", data.session)
      console.log("ERROR:", error)

      if (data.session) {
        setReady(true)
      }
    }

    checkSession()
  }, [])

  async function updatePassword() {
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      console.error(error)
      alert("Errore reset password")
      return
    }

    alert("Password aggiornata ✔")
    window.location.href = "/"
  }

  if (!ready) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Link non valido o sessione non attiva</h2>
        <p>Rifai reset password</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Reset Password</h1>

      <input
        type="password"
        placeholder="Nuova password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={updatePassword}>
        Aggiorna password
      </button>
    </div>
  )
}