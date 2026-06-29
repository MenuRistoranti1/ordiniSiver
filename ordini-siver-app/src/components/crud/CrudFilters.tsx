import type { ReactNode } from "react"
import FilterSelect from "@/components/ui/FilterSelect"
import SearchBar from "@/components/ui/SearchBar"

type FilterOption = {
  label: string
  value: string
}

type SelectFilter = {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
}

type Props = {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  selects?: SelectFilter[]
  actions?: ReactNode
}

export default function CrudFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cerca...",
  selects = [],
  actions,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_repeat(3,220px)]">
        {onSearchChange && (
          <SearchBar
            value={searchValue || ""}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}

        {selects.map((select, index) => (
          <FilterSelect
            key={index}
            value={select.value}
            onChange={select.onChange}
            options={select.options}
          />
        ))}
      </div>

      {actions && <div className="flex justify-end">{actions}</div>}
    </div>
  )
}