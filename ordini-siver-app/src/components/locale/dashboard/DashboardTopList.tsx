type TopItem = {
  nome: string
  quantita: number
}

type DashboardTopListProps = {
  title: string
  subtitle: string
  items: TopItem[]
  empty: string
  danger?: boolean
}

export function DashboardTopList({
  title,
  subtitle,
  items,
  empty,
  danger = false,
}: DashboardTopListProps) {
  return (
    <section
      className={`min-w-0 rounded-3xl border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        danger && items.length > 0
          ? "border-red-300 shadow-red-100"
          : "border-slate-200 shadow-slate-200"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2
            className={`text-lg font-black sm:text-xl ${
              danger ? "text-red-800" : "text-slate-950"
            }`}
          >
            {title}
          </h2>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {subtitle}
          </p>
        </div>

        {danger && items.length > 0 && (
          <span className="animate-pulse rounded-full bg-red-700 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
            Alert
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
          {empty}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.nome}-${index}`}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                danger
                  ? "border-red-100 bg-red-50"
                  : "border-slate-100 bg-slate-50 hover:bg-blue-50"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">
                  #{index + 1} — {item.nome}
                </p>

                <p className="text-xs font-bold text-slate-500">
                  {danger ? "Dispersione calcolata" : "Totale ordinato"}
                </p>
              </div>

              <div
                className={`shrink-0 rounded-2xl px-3 py-2 text-xl font-black ${
                  danger
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {item.quantita}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}