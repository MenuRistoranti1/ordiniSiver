/*
  "annullato" chiude una riga che non sarà mai evasa: ordine ritirato o
  fornitura cancellata dal fornitore. Senza questo stato la riga resterebbe
  aperta per sempre, gonfiando l'arretrato con merce che nessuno aspetta più.
*/
export type StatoConsegna =
  | "da_consegnare"
  | "parziale"
  | "consegnato"
  | "annullato"

/**
 * Una riga d'ordine ancora aperta, cioè con merce che deve ancora arrivare.
 *
 * Le righe non appartengono a una singola settimana: un prodotto ordinato a
 * inizio mese e mai consegnato resta aperto e continua a comparire finché non
 * viene evaso, anche se nel frattempo non è stato riordinato.
 */
export type RigaRicezione = {
  ordineId: string
  nomeProdotto: string
  supplierCode: string
  /** Settimana dell'ordine da cui nasce la riga. */
  settimanaOrdine: string
  /** Da quante settimane la riga è in attesa. */
  settimaneDiAttesa: number
  quantitaOrdinata: number
  /** Totale già ricevuto e validato nelle consegne precedenti. */
  giaRicevuta: number
  /** Quanto manca ancora: ordinata meno già ricevuta. */
  residuo: number
  /** Quantità imputata a questa riga dai documenti non ancora conteggiati. */
  propostaDaDocumenti: number
  /** Quantità che il responsabile dichiara arrivata in questa consegna. */
  inArrivo: number
  statoConsegna: StatoConsegna
  validataDa: string | null
  validataIl: string | null
  /** Righe documento da cui nasce la proposta, da marcare come conteggiate. */
  documentRowIds: string[]
}

/**
 * Riga di un documento che non ha trovato nessun ordine aperto con quel
 * codice: merce arrivata senza essere stata ordinata, o codice sconosciuto.
 */
export type RigaSenzaOrdine = {
  documentRowId: string
  documentoNome: string
  tipoDocumento: string
  supplierCode: string | null
  nomeProdotto: string
  quantita: number
}

export type DocumentoRicezione = {
  id: string
  fileName: string
  tipo: string
  dataDocumento: string | null
  numeroDocumento: string | null
  righeAbbinate: number
  righeTotali: number
}

export type Ricezione = {
  righe: RigaRicezione[]
  senzaOrdine: RigaSenzaOrdine[]
  documenti: DocumentoRicezione[]
}
