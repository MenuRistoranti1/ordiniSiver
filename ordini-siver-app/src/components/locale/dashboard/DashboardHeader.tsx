import { RefreshCw } from "lucide-react"

type DashboardHeaderProps = {
  userName: string
  restaurantName: string
  greeting: string
  loading: boolean
  onRefresh: () => void
}

export function DashboardHeader({
  userName,
  restaurantName,
  greeting,
  loading,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <header className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            Dashboard locale
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {userName ? `${greeting}, ${userName}` : greeting}
          </h1>

          <p className="mt-1 text-sm font-bold text-slate-500">
            {restaurantName || "Caricamento..."} · Stato ordini, giacenze,
            messaggi, documenti e dispersioni
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition-all duration-200 hover:bg-blue-700 disabled:bg-slate-400"
        >
          <RefreshCw
            className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
          />

          {loading ? "Aggiorno..." : "Aggiorna"}
        </button>
      </div>
    </header>
  )
}