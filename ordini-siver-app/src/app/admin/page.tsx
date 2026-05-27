"use client"

import { useState } from "react"

export default function AdminLogin() {
  const [pin, setPin] = useState("")

  function entra() {
    if (pin !== "9999") {
      alert("PIN admin errato")
      return
    }

    localStorage.setItem("admin", "true")
    window.location.href = "/admin-dashboard"
  }

  return (
    <main className="min-h-screen bg-gray-100 p-12 flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-xl">
        <h1 className="text-5xl font-bold mb-8">Accesso Admin</h1>

        <input
          type="password"
          placeholder="PIN admin"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full p-5 border rounded-2xl mb-6 text-2xl"
        />

        <button
          onClick={entra}
          className="w-full bg-blue-600 text-white p-5 rounded-2xl text-3xl font-bold"
        >
          Entra
        </button>
      </div>
    </main>
  )
}