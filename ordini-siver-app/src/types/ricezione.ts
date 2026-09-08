export type StatoConsegna = "da_consegnare" | "parziale" | "consegnato"

/**
 * Una riga d'ordine vista dal momento della ricezione: quanto era stato
 * ordinato, quanto propongono i documenti del fornitore e quanto il
 * responsabile dichiara di aver ricevuto davvero.
 */
export type RigaRicezione = {
  ordineId: string
  nomeProdotto: string
  supplierCode: string
  quantitaOrdinata: number
  /** Quantità arrivata secondo la fattura, se una riga è stata abbinata. */
  daFattura: number | null
  /** Quantità dichiarata mancante dall'inevaso. */
  daInevaso: number | null
  /** Valore proposto e poi corretto dal responsabile. */
  quantitaConsegnata: number
  statoConsegna: StatoConsegna
  validataDa: string | null
  validataIl: string | null
}

/**
 * Riga presente nei documenti ma senza un ordine corrispondente: merce
 * arrivata senza essere stata ordinata, oppure codice non riconosciuto.
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
