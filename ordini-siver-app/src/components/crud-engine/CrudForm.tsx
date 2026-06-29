"use client"

import { useLookup } from "@/hooks/useLookup"
import type { CrudField, CrudOption } from "./types"

type Props = {
  fields: CrudField[]
  values: Record<string, any>
  onChange: (name: string, value: any) => void
}

function SelectField({
  field,
  value,
  className,
  onChange,
}: {
  field: CrudField
  value: any
  className: string
  onChange: (name: string, value: any) => void
}) {
  const { items, loading, config } = useLookup(field.source)

const dynamicOptions: CrudOption[] = items.map((item) => ({
  label: String(
    item[config?.labelKey || "name"] ??
      item.name ??
      item.description ??
      item.code ??
      item.id
  ),
  value: String(item[config?.valueKey || "id"]),
}))
  const options = field.source ? dynamicOptions : field.options || []

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-bold text-slate-700">
        {field.label}
        {field.required ? " *" : ""}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(field.name, e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
      >
        <option value="">{loading ? "Caricamento..." : "Seleziona"}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function CrudForm({ fields, values, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const value = values[field.name] ?? field.defaultValue ?? ""
        const className = field.colSpan === 2 ? "sm:col-span-2" : ""

        if (field.type === "select") {
          return (
            <SelectField
              key={field.name}
              field={field}
              value={value}
              className={className}
              onChange={onChange}
            />
          )
        }

        if (field.type === "textarea") {
          return (
            <div key={field.name} className={className}>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                {field.label}
                {field.required ? " *" : ""}
              </label>

              <textarea
                value={value}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.name, e.target.value)}
                className="min-h-[120px] w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>
          )
        }

        if (field.type === "checkbox") {
          return (
            <label
              key={field.name}
              className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 ${className}`}
            >
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(field.name, e.target.checked)}
                className="h-4 w-4"
              />

              <span className="text-sm font-bold text-slate-700">
                {field.label}
              </span>
            </label>
          )
        }

        return (
          <div key={field.name} className={className}>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              {field.label}
              {field.required ? " *" : ""}
            </label>

            <input
              type={
                field.type === "number" || field.type === "currency"
                  ? "number"
                  : field.type === "date"
                    ? "date"
                    : "text"
              }
              value={value}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.name, e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            />
          </div>
        )
      })}
    </div>
  )
}