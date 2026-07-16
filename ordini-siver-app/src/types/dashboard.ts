export type TopItem = {
  nome: string
  quantita: number
}

export type GiacenzeInfo = {
  compilati: number
  totale: number
  percentuale: number
  completa: boolean
}

export type LocaleScelta = {
  restaurant_id: string
  restaurant_name: string
  role?: string | null
}

export type DashboardStats = {
  giacenzeInfo: GiacenzeInfo
  messaggiNonLetti: number
  documentiNonLetti: number
  topOrdinati: TopItem[]
  topRotti: TopItem[]
  totaleOrdini: number
  totaleRotture: number
}