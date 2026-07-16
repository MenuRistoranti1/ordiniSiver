import { supabase } from "@/lib/supabase"

export async function caricaMessaggiNonLetti(
  localeId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("messages")
    .select("id")
    .eq("locale_id", localeId)
    .eq("sender", "admin")
    .eq("is_read", false)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).length
}