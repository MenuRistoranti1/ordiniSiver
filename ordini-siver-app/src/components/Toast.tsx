"use client"

import { createContext, useContext, useState } from "react"

type ToastType = "success" | "error" | "warning" | "info"

type Toast = {
  id: string
  message: string
  type: ToastType
}

const ToastContext = createContext<{
  showToast: (message: string, type?: ToastType) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  function showToast(message: string, type: ToastType = "info") {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3500)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className="fixed right-4 top-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : toast.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : toast.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error("useToast deve essere usato dentro ToastProvider")
  }

  return context
}