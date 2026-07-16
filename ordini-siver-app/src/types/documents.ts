export type LocaleDocument = {
  id: string
  file_name: string
  file_type: string | null
  file_url: string | null
  status: string
  created_at: string
}

export type DocumentOpenMode = "view" | "download"
