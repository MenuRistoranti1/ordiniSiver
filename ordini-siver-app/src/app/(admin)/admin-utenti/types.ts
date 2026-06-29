export type Locale = {
  id: string
  name: string
}

export type UtenteLocale = {
  id: string
  nome: string
  cognome: string
  utente: string
  email_interna?: string
  locale_id: string | null
  locale_nome: string | null
  active: boolean
  created_at: string
  updated_at?: string | null
  last_login?: string | null
  force_password_change?: boolean
}

export type NuovoUtenteForm = {
  nome: string
  cognome: string
  utente: string
  password: string
  locale_id: string
}

export type ModificaUtenteForm = {
  nome: string
  cognome: string
  utente: string
  locale_id: string
  active: boolean
}

export type StatisticheUtenti = {
  totali: number
  attivi: number
  disattivati: number
  localiCoperti: number
}