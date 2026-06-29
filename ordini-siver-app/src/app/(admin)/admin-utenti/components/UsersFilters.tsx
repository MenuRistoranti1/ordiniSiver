import FilterSelect from "@/components/ui/FilterSelect"
import SearchBar from "@/components/ui/SearchBar"
import type { Locale } from "../types"

type Props = {
  ricerca: string
  setRicerca: (value: string) => void
  filtroLocale: string
  setFiltroLocale: (value: string) => void
  locali: Locale[]
}

export default function UsersFilters({
  ricerca,
  setRicerca,
  filtroLocale,
  setFiltroLocale,
  locali,
}: Props) {
  const options = [
    { label: "Tutti i locali", value: "tutti" },
    ...locali.map((locale) => ({
      label: locale.name,
      value: locale.id,
    })),
  ]

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
      <SearchBar
        value={ricerca}
        onChange={setRicerca}
        placeholder="Cerca per nome, cognome, username o locale..."
      />

      <FilterSelect
        value={filtroLocale}
        onChange={setFiltroLocale}
        options={options}
      />
    </div>
  )
}