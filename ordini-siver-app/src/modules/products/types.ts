export type Product = {
  id: string
  supplier_code: string | null
  internal_code?: string | null
  barcode?: string | null
  name: string
  category: string | null
  category_id?: string | null
  unit: string | null
  unit_id?: string | null
  active: boolean | null
  created_at: string | null
  updated_at?: string | null
  price: number | null
  vat: number | null
  required_stock: boolean | null
  image_url: string | null
  notes: string | null
  min_stock?: number | null
  max_stock?: number | null
  last_price_update?: string | null
  deleted_at?: string | null
  category_ref?: {
  id: string
  name: string
} | null

unit_ref?: {
  id: string
  code: string
  description: string | null
} | null
}

export type ProductForm = {
  name: string
  supplier_code: string
  internal_code: string
  barcode: string
  category: string
  category_id: string
  unit: string
  unit_id: string
  price: string
  vat: string
  min_stock: string
  max_stock: string
  required_stock: boolean
  active: boolean
  image_url: string
  notes: string
}

export type ProductStats = {
  totali: number
  attivi: number
  disattivati: number
  categorie: number
}