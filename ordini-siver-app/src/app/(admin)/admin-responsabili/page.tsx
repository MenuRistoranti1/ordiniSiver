"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AdminResponsabili() {
  const [form, setForm] = useState({
    nome: "",
    cognome: "",
    email: "",
    password: "",
    locale_id: "",
  })

  async function createUser() {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    const res = await fetch("/api/responsabili/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || "Errore creazione responsabile")
      return
    }

    alert("Responsabile creato ✔")
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Gestione Responsabili</h1>

      <input
        placeholder="Nome"
        value={form.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
      />

      <input
        placeholder="Cognome"
        value={form.cognome}
        onChange={(e) => setForm({ ...form, cognome: e.target.value })}
      />

      <input
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <input
        placeholder="Locale ID"
        value={form.locale_id}
        onChange={(e) => setForm({ ...form, locale_id: e.target.value })}
      />

      <button onClick={createUser}>Crea Responsabile</button>
    </div>
  )
}