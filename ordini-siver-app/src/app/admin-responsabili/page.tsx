"use client"

import { useState } from "react"

export default function AdminResponsabili() {
  const [form, setForm] = useState({
    nome: "",
    cognome: "",
    email: "",
    password: "",
    locale_id: "",
  })

  async function createUser() {
    const res = await fetch("/api/responsabili/create", {
      method: "POST",
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error)
      return
    }

    alert("Responsabile creato ✔")
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Gestione Responsabili</h1>

      <input
        placeholder="Nome"
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
      />

      <input
        placeholder="Cognome"
        onChange={(e) => setForm({ ...form, cognome: e.target.value })}
      />

      <input
        placeholder="Email"
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        placeholder="Password"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <input
        placeholder="Locale ID"
        onChange={(e) => setForm({ ...form, locale_id: e.target.value })}
      />

      <button onClick={createUser}>
        Crea Responsabile
      </button>
    </div>
  )
}