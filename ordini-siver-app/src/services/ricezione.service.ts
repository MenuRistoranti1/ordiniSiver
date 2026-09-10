import { supabase } from "@/lib/supabase"
import type {
  DocumentoRicezione,
  Ricezione,
  RigaRicezione,
  RigaSenzaOrdine,
  StatoConsegna,
} from "@/types/ricezione"

/*
  Ricezione merce: confronto fra ciò che è stato ordinato e ciò che il
  fornitore ha davvero consegnato.

  Il conto non si chiude dentro la settimana. Un prodotto ordinato e non
  consegnato resta inevaso e può arrivare settimane dopo, dentro una fattura
  che non corrisponde a nessun ordine recente: se guardassimo solo la settimana
  corrente, quella consegna finirebbe fra la "merce non ordinata" e l'ordine
  vecchio resterebbe apertosine die.

  Per questo le quantità dei documenti vengono imputate alle righe d'ordine
  ancora aperte, dalla più vecchia alla più recente. Solo ciò che avanza, e
  che quindi non era stato ordinato da nessuno, viene segnalato a parte.

  Ogni riga di documento già conteggiata viene marcata (matched_order_id), così
  la stessa fattura non viene sommata due volte alle riaperture successive.
*/

const SETTIMANA_MS = 7 * 24 * 60 * 60 * 1000

export async function caricaRicezione(localeId: string): Promise<Ricezione> {
  const [ordini, documenti] = await Promise.all([
    caricaOrdiniAperti(localeId),
    caricaDocumentiLocale(localeId),
  ])

  const righeDocumento = await caricaRigheDaConteggiare(
    documenti.map((documento) => documento.id),
  )

  const tipoPerDocumento = new Map(
    documenti.map((d) => [String(d.id), String(d.document_type || "")]),
  )
  const nomePerDocumento = new Map(
    documenti.map((d) => [String(d.id), String(d.file_name || "Documento")]),
  )

  /*
    Solo le fatture dicono cosa è arrivato: l'inevaso elenca ciò che manca, e
    sommarlo alle consegne significherebbe contare merce mai arrivata.

    Le note di credito vanno invece sottratte: stornano una fattura, quindi
    quella merce è stata resa o annullata. Trattarle come consegne farebbe
    risultare evaso un ordine che non lo è.
  */
  const disponibili = new Map<string, { quantita: number; ids: string[] }>()

  for (const riga of righeDocumento) {
    const tipo = tipoPerDocumento.get(String(riga.document_id))
    if (tipo !== "fattura" && tipo !== "nota_credito") continue

    const codice = normalizzaCodice(riga.supplier_code)
    if (!codice) continue

    const segno = tipo === "nota_credito" ? -1 : 1
    const voce = disponibili.get(codice) || { quantita: 0, ids: [] }

    voce.quantita += segno * Number(riga.quantity || 0)
    if (segno > 0) voce.ids.push(String(riga.id))

    disponibili.set(codice, voce)
  }

  // Uno storno può superare le consegne registrate: la disponibilità non
  // scende sotto zero, semmai resta merce da ricevere.
  for (const voce of disponibili.values()) {
    if (voce.quantita < 0) voce.quantita = 0
  }

  const oggi = Date.now()

  // Le righe più vecchie hanno la precedenza: la merce che arriva copre prima
  // gli ordini rimasti indietro.
  const aperti = [...ordini].sort((a, b) =>
    String(a.settimana_key || "").localeCompare(String(b.settimana_key || "")),
  )

  const righe: RigaRicezione[] = aperti.map((ordine) => {
    const quantitaOrdinata = Number(ordine.quantita || 0)
    const giaRicevuta = Number(ordine.quantita_consegnata || 0)
    const residuo = Math.max(0, quantitaOrdinata - giaRicevuta)

    const codice = normalizzaCodice(ordine.supplier_code)
    const voce = codice ? disponibili.get(codice) : undefined

    let proposta = 0
    let documentRowIds: string[] = []

    if (voce && voce.quantita > 0 && residuo > 0) {
      proposta = Math.min(residuo, voce.quantita)
      documentRowIds = [...voce.ids]

      // Quanto imputato qui non è più disponibile per le righe successive.
      voce.quantita -= proposta
    }

    const settimana = String(ordine.settimana_key || "")
    const attesa = settimana
      ? Math.max(
          0,
          Math.floor((oggi - new Date(settimana).getTime()) / SETTIMANA_MS),
        )
      : 0

    return {
      ordineId: String(ordine.id),
      nomeProdotto: String(ordine.nome_prodotto || "Prodotto"),
      supplierCode: String(ordine.supplier_code || ""),
      settimanaOrdine: settimana,
      settimaneDiAttesa: attesa,
      quantitaOrdinata,
      giaRicevuta,
      residuo,
      propostaDaDocumenti: proposta,
      inArrivo: proposta,
      statoConsegna: (ordine.stato_consegna || "da_consegnare") as StatoConsegna,
      validataDa: ordine.consegna_validata_da || null,
      validataIl: ordine.consegna_validata_il || null,
      documentRowIds,
    }
  })

  // Ciò che resta dopo l'imputazione non era stato ordinato da nessuno.
  const senzaOrdine: RigaSenzaOrdine[] = []

  for (const riga of righeDocumento) {
    const tipo = tipoPerDocumento.get(String(riga.document_id)) || ""
    const codice = normalizzaCodice(riga.supplier_code)
    const voce = codice ? disponibili.get(codice) : undefined

    const avanzata = tipo === "fattura" ? (voce?.quantita ?? 0) : 0
    const nonOrdinata = tipo === "fattura" && (!codice || avanzata > 0)

    if (!nonOrdinata) continue

    senzaOrdine.push({
      documentRowId: String(riga.id),
      documentoNome: nomePerDocumento.get(String(riga.document_id)) || "",
      tipoDocumento: tipo,
      supplierCode: riga.supplier_code || null,
      nomeProdotto: String(riga.product_name || "Prodotto"),
      quantita: avanzata || Number(riga.quantity || 0),
    })

    if (voce) voce.quantita = 0
  }

  const idsImputate = new Set(righe.flatMap((riga) => riga.documentRowIds))

  const riepilogo: DocumentoRicezione[] = documenti.map((documento) => {
    const suoi = righeDocumento.filter(
      (riga) => String(riga.document_id) === String(documento.id),
    )

    return {
      id: String(documento.id),
      fileName: String(documento.file_name || "Documento"),
      tipo: String(documento.document_type || "sconosciuto"),
      dataDocumento: documento.document_date || null,
      numeroDocumento: documento.document_number || null,
      righeTotali: suoi.length,
      righeAbbinate: suoi.filter((riga) => idsImputate.has(String(riga.id)))
        .length,
    }
  })

  return { righe, senzaOrdine, documenti: riepilogo }
}

/**
 * Registra una consegna su una riga d'ordine, sommandola a quelle precedenti.
 * La riga resta aperta finché l'ordinato non è coperto: così un inevaso può
 * chiudersi con una consegna di settimane dopo.
 */
export async function registraConsegna(input: {
  ordineId: string
  quantitaOrdinata: number
  giaRicevuta: number
  inArrivo: number
  operatore: string
  documentRowIds: string[]
}): Promise<void> {
  const totale = Math.max(0, input.giaRicevuta + Math.max(0, input.inArrivo))
  const consegnata = Math.min(totale, input.quantitaOrdinata)

  const { error } = await supabase
    .from("ordini")
    .update({
      quantita_consegnata: consegnata,
      quantita_inevasa: Math.max(0, input.quantitaOrdinata - consegnata),
      stato_consegna: statoDaQuantita(input.quantitaOrdinata, consegnata),
      consegna_validata_da: input.operatore.trim() || "Operatore",
      consegna_validata_il: new Date().toISOString(),
    })
    .eq("id", input.ordineId)

  if (error) throw new Error(error.message)

  // Marca le righe di documento già conteggiate, perché la prossima apertura
  // della schermata non le riproponga sommandole di nuovo.
  if (input.documentRowIds.length > 0) {
    const { error: erroreRighe } = await supabase
      .from("document_rows")
      .update({ matched_order_id: input.ordineId })
      .in("id", input.documentRowIds)

    if (erroreRighe) throw new Error(erroreRighe.message)
  }
}

export function statoDaQuantita(
  ordinata: number,
  consegnata: number,
): StatoConsegna {
  if (consegnata <= 0) return "da_consegnare"
  if (consegnata < ordinata) return "parziale"
  return "consegnato"
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

/**
 * Righe d'ordine ancora scoperte, di qualsiasi settimana: è l'elenco di ciò
 * che il fornitore deve ancora consegnare.
 */
async function caricaOrdiniAperti(localeId: string) {
  const { data, error } = await supabase
    .from("ordini")
    .select(
      "id, nome_prodotto, supplier_code, quantita, quantita_consegnata, stato_consegna, settimana_key, consegna_validata_da, consegna_validata_il, nota_consegna",
    )
    .eq("locale_id", localeId)
    .order("settimana_key", { ascending: true })

  if (error) throw new Error(error.message)

  return (data || []).filter(
    (ordine) =>
      ordine.stato_consegna !== "annullato" &&
      Number(ordine.quantita || 0) > Number(ordine.quantita_consegnata || 0),
  )
}

async function caricaDocumentiLocale(localeId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, file_name, document_type, document_number, document_date, created_at",
    )
    .eq("restaurant_id", localeId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  return data || []
}

/** Solo le righe non ancora imputate a un ordine. */
async function caricaRigheDaConteggiare(idsDocumenti: string[]) {
  if (idsDocumenti.length === 0) return []

  const { data, error } = await supabase
    .from("document_rows")
    .select("id, document_id, supplier_code, product_name, quantity")
    .in("document_id", idsDocumenti)
    .is("matched_order_id", null)

  if (error) throw new Error(error.message)

  return data || []
}

function normalizzaCodice(valore: unknown) {
  return String(valore || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .trim()
}

