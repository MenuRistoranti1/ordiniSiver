"use client"

import ActionMenu from "@/components/ui/ActionMenu"
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable"
import type { CrudAction, CrudColumn } from "./types"

type Props<T> = {
  data: T[]
  columns: CrudColumn<T>[]
  actions?: CrudAction<T>[]
  getRowId: (row: T) => string
  emptyTitle?: string
  emptyDescription?: string
}

export default function CrudTable<T>({
  data,
  columns,
  actions = [],
  getRowId,
  emptyTitle = "Nessun dato trovato",
  emptyDescription = "Prova a modificare i filtri oppure crea un nuovo elemento.",
}: Props<T>) {
  const tableColumns: DataTableColumn<T>[] = [
    ...columns.map((column) => ({
      key: column.key,
      header: column.label,
      render: column.render || ((row: T) => String((row as any)[column.key] ?? "-")),
      className: column.className,
    })),
    ...(actions.length > 0
      ? [
          {
            key: "actions",
            header: "",
            className: "w-20",
            render: (row: T) => (
              <ActionMenu
                actions={actions.map((action) => ({
                  label: action.label,
                  icon: action.icon,
                  danger: action.danger,
                  onClick: () => action.onClick(row),
                }))}
              />
            ),
          },
        ]
      : []),
  ]

  return (
    <DataTable
      columns={tableColumns}
      data={data}
      keyExtractor={getRowId}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  )
}