"use client"

import { Search, X } from "lucide-react"

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Cerca...",
}: Props) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-12 text-sm font-semibold outline-none transition focus:border-blue-600"
      />

      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 hover:bg-slate-100"
        >
          <X className="h-4 w-4 text-slate-500" />
        </button>
      )}
    </div>
  )
}