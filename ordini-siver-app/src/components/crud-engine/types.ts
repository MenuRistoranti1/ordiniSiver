import type { ReactNode } from "react"

export type CrudFieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "select"
  | "checkbox"
  | "date"

export type CrudOption = {
  label: string
  value: string
}

export type CrudField = {
  name: string
  label: string
  type: CrudFieldType
  required?: boolean
  placeholder?: string

  options?: CrudOption[]

  source?: string      // <-- nuovo
  optionLabel?: string // <-- nuovo
  optionValue?: string // <-- nuovo

  defaultValue?: string | number | boolean | null
  colSpan?: 1 | 2
}

export type CrudColumn<T> = {
  key: string
  label: string
  render?: (row: T) => ReactNode
  className?: string
}

export type CrudStat = {
  label: string
  value: string | number
  description?: string
  icon?: ReactNode
}

export type CrudAction<T> = {
  label: string
  danger?: boolean
  icon?: ReactNode
  onClick: (row: T) => void
}

export type CrudModuleConfig<T> = {
  title: string
  description?: string
  eyebrow?: string
  createLabel?: string
  columns: CrudColumn<T>[]
  fields: CrudField[]
  stats?: CrudStat[]
  actions?: CrudAction<T>[]
  getRowId: (row: T) => string
}