import { supabase } from "@/lib/supabase"
import type {
  DocumentoRicezione,
  Ricezione,
  RigaRicezione,
  RigaSenzaOrdine,
  StatoConsegna,
} from "@/types/ricezione"

/*
  La ricezione mette a confronto tre cose per lo stesso locale e la stessa
  settimana: le righe ordinate, quanto la fattura dice sia arrivato e quanto
  l'inevaso dice manchi. L'abbinamento passa dal codice fornitore, l'unico
  dato presente sia negli ordini sia nei documenti.

  Tutto quello che il responsabile conferma finisce sulle righe d'ordine, non
  in memoria del browser: nello stesso locale chi ordina e chi riceve la merce
  sono spesso persone diverse, e il lavoro di uno deve essere visibile all'altro.
*/

export async function caricaRicezione(
  localeId: string,
  settimanaKey: string,
): Promise<Ricezione> {
  const [ordini, documenti] = await Promise.all([
    caricaOrdiniSettimana(localeId, settimanaKey),
    caricaDocumentiLocale(localeId),
  ])

  const idsDocumenti = documenti.map((documento) => documento.id)
  const righeDocumento = await caricaRigheDocumenti(idsDocumenti)

  const tipoPerDocumento = new Map(
    documenti.map((documento) => [
      String(documento.id),
      String(documento.document_type || ""),
    ]),
  )

  const nomePerDocumento = new Map(
    documenti.map((documento) => [
      String(documento.id),
      String(documento.file_name || "Documento"),
    ]),
  )

  const abbinate = new Set<string>()

  const righe: RigaRicezione[] = ordini.map((ordine) => {
    const codice = normalizzaCodice(ordine.supplier_code)

    const corrispondenti = righeDocumento.filter(
      (riga) => codice && normalizzaCodice(riga.supplier_code) === codice,
    )

    corrispondenti.forEach((riga) => abbinate.add(String(riga.id)))

    const daFattura = sommaPerTipo(
      corrispondenti,
      tipoPerDocumento,
      "fattura",
    )

    const daInevaso = sommaPerTipo(
      corrispondenti,
      tipoPerDocumento,
      "inevaso",
    )

    const quantitaOrdinata = Number(ordine.quantita || 0)

    return {
      ordineId: String(ordine.id),
      nomeProdotto: String(ordine.nome_prodotto || "Prodotto"),
      supplierCode: String(ordine.supplier_code || ""),
      quantitaOrdinata,
      daFattura,
      daInevaso,
      quantitaConsegnata: quantitaProposta(ordine, {
        quantitaOrdinata,
        daFattura,
        daInevaso,
      }),
      statoConsegna: (ordine.stato_consegna ||
        "da_consegnare") as StatoConsegna,
      validataDa: ordine.consegna_validata_da || null,
      validataIl: ordine.consegna_validata_il || null,
    }
  })

  const senzaOrdine: RigaSenzaOrdine[] = righeDocumento
    .filter((riga) => !abbinate.has(String(riga.id)))
    .map((riga) => ({
      documentRowId: String(riga.id),
      documentoNome: nomePerDocumento.get(String(riga.document_id)) || "",
      tipoDocumento: tipoPerDocumento.get(String(riga.document_id)) || "",
      supplierCode: riga.supplier_code || null,
      nomeProdotto: String(riga.product_name || "Prodotto"),
      quantita: Number(riga.quantity || 0),
    }))

  const riepilogo: DocumentoRicezione[] = documenti.map((documento) => {
    const righeDelDocumento = righeDocumento.filter(
      (riga) => String(riga.document_id) === String(documento.id),
    )

    return {
      id: String(documento.id),
      fileName: String(documento.file_name || "Documento"),
      tipo: String(documento.document_type || "sconosciuto"),
      dataDocumento: documento.document_date || null,
      numeroDocumento: documento.document_number || null,
      righeTotali: righeDelDocumento.length,
      righeAbbinate: righeDelDocumento.filter((riga) =>
        abbinate.has(String(riga.id)),
      ).length,
    }
  })

  return { righe, senzaOrdine, documenti: riepilogo }
}

/**
 * Valore proposto al responsabile: se la riga è già stata validata si mostra
 * quello confermato, altrimenti si parte dai documenti. La fattura dice cosa è
 * arrivato; se c'è solo l'inevaso, si ricava per differenza dall'ordinato.
 */
function quantitaProposta(
  ordine: Record<string, unknown>,
  dati: {
    quantitaOrdinata: number
    daFattura: number | null
    daInevaso: number | null
  },
) {
  if (ordine.consegna_validata_il) {
    return Number(ordine.quantita_consegnata || 0)
  }

  if (dati.daFattura !== null) return dati.daFattura

  if (dati.daInevaso !== null) {
    return Math.max(0, dati.quantitaOrdinata - dati.daInevaso)
  }

  return 0
}

function sommaPerTipo(
  righe: Record<string, unknown>[],
  tipoPerDocumento: Map<string, string>,
  tipo: string,
) {
  const selezionate = righe.filter(
    (riga) => tipoPerDocumento.get(String(riga.document_id)) === tipo,
  )

  if (selezionate.length === 0) return null

  return selezionate.reduce(
    (somma, riga) => somma + Number(riga.quantity || 0),
    0,
  )
}

/*
  Le quantità si salvano subito, ma restano modificabili: la firma
  (consegna_validata_il) resta vuota finché il responsabile non chiude la
  ricezione. Così il collega che apre la schermata vede il conteggio già
  fatto, e chi sbaglia un numero può correggerlo finché non si conferma.
*/
export async function salvaBozzaRiga(input: {
  ordineId: string
  quantitaOrdinata: number
  quantitaConsegnata: number
}): Promise<void> {
  const consegnata = Math.max(0, input.quantitaConsegnata)

  const { error } = await supabase
    .from("ordini")
    .update({
      quantita_consegnata: consegnata,
      quantita_inevasa: Math.max(0, input.quantitaOrdinata - consegnata),
      stato_consegna: statoDaQuantita(input.quantitaOrdinata, consegnata),
    })
    .eq("id", input.ordineId)
    .is("consegna_validata_il", null)

  if (error) throw new Error(error.message)
}

/**
 * Chiusura definitiva: appone la firma su tutte le righe non ancora validate.
 * Da qui in avanti le quantità non sono più modificabili dal locale.
 */
export async function chiudiRicezione(input: {
  ordineIds: string[]
  operatore: string
}): Promise<void> {
  if (input.ordineIds.length === 0) return

  const { error } = await supabase
    .from("ordini")
    .update({
      consegna_validata_da: input.operatore.trim() || "Operatore",
      consegna_validata_il: new Date().toISOString(),
    })
    .in("id", input.ordineIds)
    .is("consegna_validata_il", null)

  if (error) throw new Error(error.message)
}

/** Segnala all'amministrazione la merce arrivata senza ordine. */
export async function segnalaRigheSenzaOrdine(input: {
  localeId: string
  localeNome: string
  operatore: string
  righe: RigaSenzaOrdine[]
}): Promise<void> {
  const elenco = input.righe
    .map(
      (riga) =>
        `• ${riga.supplierCode || "senza codice"} — ${riga.nomeProdotto}: ${riga.quantita} (${riga.tipoDocumento || "documento"} ${riga.documentoNome})`,
    )
    .join("\n")

  const testo = `RICEZIONE MERCE — righe senza ordine corrispondente\n\n${elenco}\n\nSegnalazione inviata da ${input.operatore} dalla schermata di ricezione.`

  const { error } = await supabase.from("messages").insert({
    locale_id: input.localeId,
    locale_nome: input.localeNome,
    sender: "locale",
    nome_mittente: input.operatore.trim() || "Operatore",
    message: testo,
    is_read: false,
  })

  if (error) throw new Error(error.message)
}

export function statoDaQuantita(
  ordinata: number,
  consegnata: number,
): StatoConsegna {
  if (consegnata <= 0) return "da_consegnare"
  if (consegnata < ordinata) return "parziale"
  return "consegnato"
}

async function caricaOrdiniSettimana(
  localeId: string,
  settimanaKey: string,
) {
  const { data, error } = await supabase
    .from("ordini")
    .select(
      "id, nome_prodotto, supplier_code, quantita, quantita_consegnata, stato_consegna, consegna_validata_da, consegna_validata_il",
    )
    .eq("locale_id", localeId)
    .eq("settimana_key", settimanaKey)
    .order("nome_prodotto")

  if (error) throw new Error(error.message)

  return data || []
}

async function caricaDocumentiLocale(localeId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, file_name, document_type, document_number, document_date, created_at",
    )
    .eq("restaurant_id", localeId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)

  return data || []
}

async function caricaRigheDocumenti(idsDocumenti: string[]) {
  if (idsDocumenti.length === 0) return []

  const { data, error } = await supabase
    .from("document_rows")
    .select("id, document_id, supplier_code, product_name, quantity")
    .in("document_id", idsDocumenti)

  if (error) throw new Error(error.message)

  return data || []
}

function normalizzaCodice(valore: unknown) {
  return String(valore || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .trim()
}
