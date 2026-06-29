export type Unit = {
  id: string
  code: string
  description: string | null
  active: boolean
  created_at: string | null
}

export type UnitForm = {
  code: string
  description: string
  active: boolean
}

export type UnitStats = {
  totali: number
  attive: number
  disattivate: number
}