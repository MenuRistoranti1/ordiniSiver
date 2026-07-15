"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-red-600">
        Errore caricamento documenti
      </h2>

      <p className="mt-2 text-sm text-slate-500">{error.message}</p>

      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Riprova
      </button>
    </div>
  )
}