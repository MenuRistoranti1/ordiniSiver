import { supabase } from "@/lib/supabase"

/*
  Vista amministrativa delle ricezioni: mostra a che punto è ogni locale e
  permette di riaprire quelle chiuse.

  La chiusura è irreversibile per il locale, di proposito: serve a impedire
  che i numeri cambino dopo essere stati dati per buoni. Se però un
  responsabile chiude per sbaglio o con quantità errate, senza una via di
  uscita l'errore resterebbe nei dati per sempre. Quella via passa
  dall'amministrazione, che riapre e lascia correggere.
*/

export type StatoRicezioneLocale = {
  localeId: string
  localeNome: string
  righe: number
  validate: number
  chiusa: boolean
  ultimaValidazione: string | null
  validataDa: string | null
}

export async function caricaStatoRicezioni(
  settimanaKey: string,
): Promise<StatoRicezioneLocale[]> {
  const { data, error } = await supabase
    .from("ordini")
    .select(
      "locale_id, locale_nome, consegna_validata_da, consegna_validata_il",
    )
    .eq("settimana_key", settimanaKey)

  if (error) throw new Error(error.message)

  const perLocale = new Map<string, StatoRicezioneLocale>()

  for (const riga of data || []) {
    const id = String(riga.locale_id || "")
    if (!id) continue

    const stato =
      perLocale.get(id) ||
      ({
        localeId: id,
        localeNome: String(riga.locale_nome || "Locale"),
        righe: 0,
        validate: 0,
        chiusa: false,
        ultimaValidazione: null,
        validataDa: null,
      } as StatoRicezioneLocale)

    stato.righe += 1

    if (riga.consegna_validata_il) {
      stato.validate += 1
      stato.validataDa = riga.consegna_validata_da || stato.validataDa

      if (
        !stato.ultimaValidazione ||
        riga.consegna_validata_il > stato.ultimaValidazione
      ) {
        stato.ultimaValidazione = riga.consegna_validata_il
      }
    }

    perLocale.set(id, stato)
  }

  return Array.from(perLocale.values())
    .map((stato) => ({
      ...stato,
      chiusa: stato.righe > 0 && stato.validate === stato.righe,
    }))
    .sort((a, b) => a.localeNome.localeCompare(b.localeNome))
}

/**
 * Riapre la ricezione di un locale: toglie la firma dalle righe, lasciando
 * intatte le quantità già inserite, così il locale riparte da quei numeri
 * invece che da zero.
 */
export async function riapriRicezione(input: {
  localeId: string
  localeNome: string
  settimanaKey: string
}): Promise<void> {
  const { error } = await supabase
    .from("ordini")
    .update({
      consegna_validata_da: null,
      consegna_validata_il: null,
    })
    .eq("locale_id", input.localeId)
    .eq("settimana_key", input.settimanaKey)

  if (error) throw new Error(error.message)

  // Il locale deve sapere che può (e deve) rimettere mano ai numeri.
  await supabase.from("notifications").insert({
    type: "ricezione_riaperta",
    title: "Ricezione riaperta",
    message: `L'amministrazione ha riaperto la ricezione merce della settimana ${input.settimanaKey}: puoi correggere le quantità e chiuderla di nuovo.`,
    severity: "warning",
    locale_id: input.localeId,
    locale_nome: input.localeNome,
    read: false,
    source: "ricezione",
    source_id: `${input.localeId}-${input.settimanaKey}`,
  })
}
