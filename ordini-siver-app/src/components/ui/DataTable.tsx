import type { ReactNode } from "react"
import EmptyState from "./EmptyState"

export type DataTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  emptyTitle?: string
  emptyDescription?: string
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyTitle = "Nessun dato trovato",
  emptyDescription,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-5 py-4 text-left text-xs font-black uppercase tracking-wide ${
                    column.className || ""
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-5 py-4 align-middle ${
                      column.className || ""
                    }`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}