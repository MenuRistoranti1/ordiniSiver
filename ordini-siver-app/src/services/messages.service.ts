import { supabase } from "@/lib/supabase"
import type {
  LocaleMessage,
  SendLocaleMessageInput,
} from "@/types/messages"

export async function caricaMessaggiLocale(
  localeId: string,
): Promise<LocaleMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, locale_id, locale_nome, sender, nome_mittente, message, is_read, created_at",
    )
    .eq("locale_id", localeId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as LocaleMessage[]
}

export async function segnaMessaggiAdminComeLetti(
  localeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("locale_id", localeId)
    .eq("sender", "admin")
    .eq("is_read", false)

  if (error) {
    throw new Error(error.message)
  }
}

export async function inviaMessaggioLocale(
  input: SendLocaleMessageInput,
): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    locale_id: input.localeId,
    locale_nome: input.localeNome,
    sender: "locale",
    nome_mittente: input.nomeMittente.trim(),
    message: input.message.trim(),
    is_read: false,
  })

  if (error) {
    throw new Error(error.message)
  }
}