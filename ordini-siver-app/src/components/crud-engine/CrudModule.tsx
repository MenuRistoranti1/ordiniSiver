"use client"

import { useMemo, useState } from "react"
import { Edit, Plus, Trash2 } from "lucide-react"
import CrudPage from "@/components/crud/CrudPage"
import CrudToolbar from "@/components/crud/CrudToolbar"
import CrudFormModal from "@/components/crud/CrudFormModal"
import CrudFilters from "@/components/crud/CrudFilters"
import StatsGrid from "@/components/crud/StatsGrid"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import Loading from "@/components/ui/Loading"
import CrudForm from "./CrudForm"
import CrudTable from "./CrudTable"
import type { CrudAction, CrudModuleConfig } from "./types"

type Props<T> = {
  config: CrudModuleConfig<T>
  data: T[]
  loading: boolean
  saving: boolean
  searchValue: string
  onSearchChange: (value: string) => void
  message?: string
  error?: string
  onCreate: (values: Record<string, any>) => Promise<boolean>
  onUpdate?: (id: string, values: Record<string, any>) => Promise<boolean>
  onDelete?: (id: string) => Promise<boolean>
}

export default function CrudModule<T>({
  config,
  data,
  loading,
  saving,
  searchValue,
  onSearchChange,
  message,
  error,
  onCreate,
  onUpdate,
  onDelete,
}: Props<T>) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editRow, setEditRow] = useState<T | null>(null)
  const [deleteRow, setDeleteRow] = useState<T | null>(null)
  const [formValues, setFormValues] = useState<Record<string, any>>({})

  const filteredData = useMemo(() => {
    const q = searchValue.toLowerCase().trim()
    if (!q) return data

    return data.filter((row) =>
      Object.values(row as Record<string, unknown>)
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    )
  }, [data, searchValue])

function openCreate() {
  const initialValues: Record<string, any> = {}

  config.fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      initialValues[field.name] = field.defaultValue
    }
  })

  setFormValues(initialValues)
  setCreateOpen(true)
}
  function openEdit(row: T) {
    setEditRow(row)
    setFormValues(row as Record<string, any>)
  }

  function updateField(name: string, value: any) {
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  async function submitCreate() {
    const ok = await onCreate(formValues)

    if (ok) {
      setCreateOpen(false)
      setFormValues({})
    }
  }

  async function submitEdit() {
    if (!editRow || !onUpdate) return

    const ok = await onUpdate(config.getRowId(editRow), formValues)

    if (ok) {
      setEditRow(null)
      setFormValues({})
    }
  }

  async function confirmDelete() {
    if (!deleteRow || !onDelete) return

    const ok = await onDelete(config.getRowId(deleteRow))

    if (ok) {
      setDeleteRow(null)
    }
  }

  if (loading) {
    return <Loading title="Caricamento dati..." />
  }

  const engineActions: CrudAction<T>[] = [
    ...(config.actions || []),
    ...(onUpdate
      ? [
          {
            label: "Modifica",
            icon: <Edit className="h-4 w-4" />,
            onClick: openEdit,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            label: "Disattiva",
            icon: <Trash2 className="h-4 w-4" />,
            danger: true,
            onClick: (row: T) => setDeleteRow(row),
          },
        ]
      : []),
  ]

  return (
    <CrudPage
      eyebrow={config.eyebrow}
      title={config.title}
      description={config.description}
      actions={
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {config.createLabel || "Nuovo"}
        </button>
      }
    >
      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {config.stats && config.stats.length > 0 && (
        <StatsGrid items={config.stats} />
      )}

      <CrudToolbar>
        <CrudFilters
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder="Cerca..."
        />
      </CrudToolbar>

      <CrudTable
        data={filteredData}
        columns={config.columns}
        actions={engineActions}
        getRowId={config.getRowId}
      />

      <CrudFormModal
        open={createOpen}
        title={config.createLabel || "Nuovo elemento"}
        loading={saving}
        submitLabel="Salva"
        onClose={() => setCreateOpen(false)}
        onSubmit={submitCreate}
      >
        <CrudForm fields={config.fields} values={formValues} onChange={updateField} />
      </CrudFormModal>

      <CrudFormModal
        open={!!editRow}
        title="Modifica"
        loading={saving}
        submitLabel="Salva modifiche"
        onClose={() => setEditRow(null)}
        onSubmit={submitEdit}
      >
        <CrudForm fields={config.fields} values={formValues} onChange={updateField} />
      </CrudFormModal>

      <ConfirmDialog
        open={!!deleteRow}
        title="Disattivare elemento?"
        description="L'elemento non verrà eliminato definitivamente, ma non sarà più attivo."
        confirmText="Disattiva"
        cancelText="Annulla"
        loading={saving}
        onCancel={() => setDeleteRow(null)}
        onConfirm={confirmDelete}
      />
    </CrudPage>
  )
}