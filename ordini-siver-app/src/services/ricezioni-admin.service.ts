import { supabase } from "@/lib/supabase"
import { settimanaKeyCorrente } from "@/lib/settimana"
import { caricaRicezione } from "./ricezione.service"
import type { Ricezione } from "@/types/ricezione"

/*
  Vista amministrativa delle ricezioni.

  Serve a rispondere alla domanda che i locali non si pongono: cosa è stato
  ordinato e non è mai arrivato.

  Il punto delicato è distinguere tre cose che a colpo d'occhio si somigliano:

  - merce già consegnata e coperta da una fattura caricata, che aspetta solo
    di essere registrata dal locale: non è un problema del fornitore;
  - ordini della settimana in corso, ancora in viaggio;
  - ordini di settimane passate che nessuna fattura copre: questo è
    l'arretrato vero, l'unico numero da portare al fornitore.

  Contarli insieme gonfierebbe l'arretrato con merce già arrivata.
*/

export type StatoRicezioneLocale = {
  localeId: string
  localeNome: string
  righeAperte: number
  /** Righe coperte da una fattura ma non ancora registrate dal locale. */
  daRegistrare: number
  pezziDaRegistrare: number
  /** Righe di settimane passate che nessuna fattura copre. */
  arretrato: number
  pezziArretrati: number
  ultimaValidazione: string | null
  validataDa: string | null
}

const norm = (valore: unknown) =>
  String(valore || "").toUpperCase().replace(/\s+/g, "").trim()

export async function caricaStatoRicezioni(): Promise<StatoRicezioneLocale[]> {
  const settimanaCorrente = settimanaKeyCorrente()

  const [ordini, documenti] = await Promise.all([
    leggiTutto(
      "ordini",
      "id,locale_id,locale_nome,supplier_code,quantita,quantita_consegnata,settimana_key,consegna_validata_da,consegna_validata_il",
    ),
    leggiTutto("documents", "id,restaurant_id,document_type"),
  ])

  const idsFatture = documenti
    .filter((d) => d.document_type === "fattura")
    .map((d) => String(d.id))

  const righeDocumento = await leggiRigheFatture(idsFatture)

  const localePerDocumento = new Map(
    documenti.map((d) => [String(d.id), String(d.restaurant_id || "")]),
  )

  // Quantità disponibili per locale e codice, dalle fatture non ancora imputate.
  const disponibili = new Map<string, Map<string, number>>()

  for (const riga of righeDocumento) {
    const locale = localePerDocumento.get(String(riga.document_id))
    const codice = norm(riga.supplier_code)
    if (!locale || !codice) continue

    const perLocale = disponibili.get(locale) || new Map<string, number>()
    perLocale.set(codice, (perLocale.get(codice) || 0) + Number(riga.quantity || 0))
    disponibili.set(locale, perLocale)
  }

  const perLocale = new Map<string, StatoRicezioneLocale>()

  // Le righe più vecchie vengono servite per prime, come nella schermata dei locali.
  const aperti = [...ordini].sort((a, b) =>
    String(a.settimana_key || "").localeCompare(String(b.settimana_key || "")),
  )

  for (const riga of aperti) {
    const id = String(riga.locale_id || "")
    if (!id) continue

    const stato =
      perLocale.get(id) ||
      ({
        localeId: id,
        localeNome: String(riga.locale_nome || "Locale"),
        righeAperte: 0,
        daRegistrare: 0,
        pezziDaRegistrare: 0,
        arretrato: 0,
        pezziArretrati: 0,
        ultimaValidazione: null,
        validataDa: null,
      } as StatoRicezioneLocale)

    const validataIl = riga.consegna_validata_il
      ? String(riga.consegna_validata_il)
      : null

    if (validataIl) {
      stato.validataDa = riga.consegna_validata_da
        ? String(riga.consegna_validata_da)
        : stato.validataDa

      if (!stato.ultimaValidazione || validataIl > stato.ultimaValidazione) {
        stato.ultimaValidazione = validataIl
      }
    }

    const residuo =
      Number(riga.quantita || 0) - Number(riga.quantita_consegnata || 0)

    if (residuo > 0) {
      stato.righeAperte += 1

      const codice = norm(riga.supplier_code)
      const disponibiliLocale = disponibili.get(id)
      const disponibile = codice ? disponibiliLocale?.get(codice) || 0 : 0

      const coperto = Math.min(residuo, disponibile)

      if (coperto > 0) {
        disponibiliLocale?.set(codice, disponibile - coperto)
        stato.daRegistrare += 1
        stato.pezziDaRegistrare += coperto
      }

      const scoperto = residuo - coperto

      if (scoperto > 0 && String(riga.settimana_key || "") < settimanaCorrente) {
        stato.arretrato += 1
        stato.pezziArretrati += scoperto
      }
    }

    perLocale.set(id, stato)
  }

  return Array.from(perLocale.values()).sort(
    (a, b) =>
      b.pezziArretrati - a.pezziArretrati ||
      b.pezziDaRegistrare - a.pezziDaRegistrare ||
      a.localeNome.localeCompare(b.localeNome),
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

/*
  Supabase restituisce al massimo mille righe per chiamata: con migliaia di
  ordini una lettura secca ne perderebbe una parte in silenzio, falsando i
  conteggi.
*/
async function leggiTutto(tabella: string, select: string) {
  const righe: Record<string, unknown>[] = []

  for (let da = 0; ; da += 1000) {
    const { data, error } = await supabase
      .from(tabella)
      .select(select)
      .range(da, da + 999)

    if (error) throw new Error(error.message)

    const blocco = (data || []) as unknown as Record<string, unknown>[]
    righe.push(...blocco)

    if (blocco.length < 1000) break
  }

  return righe
}

async function leggiRigheFatture(idsFatture: string[]) {
  if (idsFatture.length === 0) return []

  const righe: Record<string, unknown>[] = []

  // Le righe già imputate a un ordine non sono più disponibili.
  for (let i = 0; i < idsFatture.length; i += 100) {
    const { data, error } = await supabase
      .from("document_rows")
      .select("id, document_id, supplier_code, quantity")
      .in("document_id", idsFatture.slice(i, i + 100))
      .is("matched_order_id", null)

    if (error) throw new Error(error.message)

    righe.push(...((data || []) as unknown as Record<string, unknown>[]))
  }

  return righe
}
