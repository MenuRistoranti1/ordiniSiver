import { supabase } from "@/lib/supabase"
import { settimanaKeyCorrente } from "@/lib/settimana"
import { caricaRicezione } from "./ricezione.service"
import type { Ricezione } from "@/types/ricezione"

/*
  Vista amministrativa delle ricezioni.

  Serve a rispondere alla domanda che i locali non si pongono: cosa è stato
  ordinato e non è mai arrivato. Le righe aperte delle settimane passate sono
  l'arretrato vero; quelle della settimana corrente sono solo merce in viaggio,
  e vanno tenute distinte per non far sembrare un problema ciò che è normale.
*/

export type StatoRicezioneLocale = {
  localeId: string
  localeNome: string
  righeAperte: number
  /** Righe di settimane precedenti ancora scoperte: l'arretrato. */
  arretrato: number
  pezziArretrati: number
  ultimaValidazione: string | null
  validataDa: string | null
}

export async function caricaStatoRicezioni(): Promise<StatoRicezioneLocale[]> {
  const settimanaCorrente = settimanaKeyCorrente()

  const { data, error } = await supabase
    .from("ordini")
    .select(
      "locale_id, locale_nome, quantita, quantita_consegnata, settimana_key, consegna_validata_da, consegna_validata_il",
    )

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
        righeAperte: 0,
        arretrato: 0,
        pezziArretrati: 0,
        ultimaValidazione: null,
        validataDa: null,
      } as StatoRicezioneLocale)

    const residuo =
      Number(riga.quantita || 0) - Number(riga.quantita_consegnata || 0)

    if (residuo > 0) {
      stato.righeAperte += 1

      if (String(riga.settimana_key || "") < settimanaCorrente) {
        stato.arretrato += 1
        stato.pezziArretrati += residuo
      }
    }

    if (riga.consegna_validata_il) {
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

  return Array.from(perLocale.values()).sort(
    (a, b) => b.pezziArretrati - a.pezziArretrati || a.localeNome.localeCompare(b.localeNome),
  )
}

/**
 * Dettaglio di un locale: le stesse righe che vede il responsabile nella sua
 * schermata di ricezione, comprese le consegne proposte dalle fatture.
 */
export async function caricaDettaglioLocale(
  localeId: string,
): Promise<Ricezione> {
  return caricaRicezione(localeId)
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
