export type Category = {
  id: string
  name: string
  active: boolean
  created_at: string | null
  updated_at: string | null
}

export type CategoryForm = {
  name: string
  active: boolean
}

export type CategoryStats = {
  totali: number
  attive: number
  disattivate: number
}