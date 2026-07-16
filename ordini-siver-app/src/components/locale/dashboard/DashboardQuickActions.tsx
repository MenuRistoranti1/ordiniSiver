import {
  ClipboardList,
  FileText,
  MessageCircle,
  Package,
  Send,
  Warehouse,
} from "lucide-react"

const actions = [
  {
    title: "Nuovo ordine",
    subtitle: "Invia ordine settimanale",
    href: "/nuovo-ordine",
    icon: Send,
    color: "bg-blue-600",
  },
  {
    title: "Giacenze",
    subtitle: "Compila le giacenze",
    href: "/giacenze",
    icon: Warehouse,
    color: "bg-green-600",
  },
  {
    title: "Storico ordini",
    subtitle: "Visualizza gli ordini",
    href: "/storico-ordini",
    icon: ClipboardList,
    color: "bg-violet-600",
  },
  {
    title: "Storico giacenze",
    subtitle: "Consulta le giacenze",
    href: "/storico-giacenze",
    icon: Package,
    color: "bg-orange-500",
  },
  {
    title: "Documenti",
    subtitle: "Documenti disponibili",
    href: "/documenti",
    icon: FileText,
    color: "bg-cyan-600",
  },
  {
    title: "Messaggi",
    subtitle: "Comunicazioni admin",
    href: "/messaggi",
    icon: MessageCircle,
    color: "bg-rose-600",
  },
]

export function DashboardQuickActions() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">
          Azioni rapide
        </h2>

        <p className="mt-1 text-sm font-bold text-slate-500">
          Accedi rapidamente alle funzioni principali.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon

          return (
            <button
              key={action.href}
              type="button"
              onClick={() => (window.location.href = action.href)}
              className="group rounded-3xl border border-slate-200 bg-white p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${action.color} text-white`}
              >
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="text-base font-black text-slate-950">
                {action.title}
              </h3>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {action.subtitle}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}