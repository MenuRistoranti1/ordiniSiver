import { supabase } from "@/lib/supabase"
import type {
  DocumentOpenMode,
  LocaleDocument,
} from "@/types/documents"

export async function caricaDocumentiLocale(
  restaurantId: string,
): Promise<LocaleDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, file_name, file_type, file_url, status, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as LocaleDocument[]
}

export async function creaUrlDocumento(
  fileUrl: string,
  mode: DocumentOpenMode = "view",
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(fileUrl, 60, {
      download: mode === "download",
    })

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Impossibile generare il link del documento")
  }

  return data.signedUrl
}