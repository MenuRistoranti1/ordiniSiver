import FilterSelect from "@/components/ui/FilterSelect"
import SearchBar from "@/components/ui/SearchBar"

type Props = {
  ricerca: string
  setRicerca: (value: string) => void
  filtroCategoria: string
  setFiltroCategoria: (value: string) => void
  filtroStato: string
  setFiltroStato: (value: string) => void
  categorie: string[]
}

export default function ProductsFilters({
  ricerca,
  setRicerca,
  filtroCategoria,
  setFiltroCategoria,
  filtroStato,
  setFiltroStato,
  categorie,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_180px]">
      <SearchBar
        value={ricerca}
        onChange={setRicerca}
        placeholder="Cerca per nome, codice, categoria, barcode..."
      />

      <FilterSelect
        value={filtroCategoria}
        onChange={setFiltroCategoria}
        options={[
          { label: "Tutte le categorie", value: "tutte" },
          ...categorie.map((categoria) => ({
            label: categoria,
            value: categoria,
          })),
        ]}
      />

      <FilterSelect
        value={filtroStato}
        onChange={setFiltroStato}
        options={[
          { label: "Tutti gli stati", value: "tutti" },
          { label: "Solo attivi", value: "attivi" },
          { label: "Solo disattivati", value: "disattivati" },
        ]}
      />
    </div>
  )
}