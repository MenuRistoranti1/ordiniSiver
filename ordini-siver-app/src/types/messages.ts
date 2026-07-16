export type LocaleMessage = {
  id: string
  locale_id: string
  locale_nome: string | null
  sender: "admin" | "locale"
  nome_mittente: string | null
  message: string
  is_read: boolean
  created_at: string
}

export type SendLocaleMessageInput = {
  localeId: string
  localeNome: string
  nomeMittente: string
  message: string
}