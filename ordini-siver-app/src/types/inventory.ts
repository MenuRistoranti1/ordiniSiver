export type InventoryProduct = {
  id: string
  nome_prodotto: string
  supplier_code: string
  min_stock: number
  max_stock: number
}

export type InventoryQuantities = Record<string, string>

export type InventoryDraft = {
  locale_id: string
  locale_nome: string
  settimana_key: string
  quantita: InventoryQuantities
  salvataAlle: string
}

export type InventoryFilter =
  | "tutti"
  | "compilati"
  | "Sotto soglia"
  | "Corretto"
  | "Sopra soglia"
  | "Da compilare"

export type InventorySort =
  | "nome"
  | "codice"
  | "min"
  | "max"
  | "stato"

export type InventoryStatus =
  | "Da compilare"
  | "Sotto soglia"
  | "Sopra soglia"
  | "Corretto"
