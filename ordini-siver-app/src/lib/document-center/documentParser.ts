/*
  Lettura delle righe articolo dai documenti Siver.

  I documenti sono tabelle: le righe si ricostruiscono dalla posizione del
  testo (vedi pdfLayout), non dal testo lineare, che incolla fra loro colonne
  accostate.

  Nell'inevaso la descrizione del prodotto sta su più righe, sopra e sotto la
  riga dei dati: ogni frammento della colonna "Prodotto" viene quindi assegnato
  alla riga dati verticalmente più vicina.
*/

import {
  colonnaPiuVicina,
  leggiFrammentiPdf,
  numeroItaliano,
  raggruppaInRighe,
  trovaColonne,
  type FrammentoPdf,
  type RigaPdf,
} from "./pdfLayout"

export type RigaDocumento = {
  rowNumber: number
  supplierCode: string | null
  productName: string
  /** Quantità non consegnata: è l'unico dato che ci interessa dell'inevaso. */
  quantity: number
  numeroOrdine?: string
  dataOrdine?: string
}

/*
  "Giac" è la giacenza di magazzino del fornitore: non ci riguarda e non viene
  salvata. Resta però nell'elenco delle colonne da individuare, perché sta
  subito a destra dell'inevaso: senza conoscerne la posizione i suoi numeri
  verrebbero attribuiti alla quantità inevasa.
*/
const COLONNE_INEVASO = [
  "N° Ordine",
  "Data",
  "Codice",
  "Prodotto",
  "Qtà Inevaso",
  "Giac",
  "Destinazione",
]

const CODICE_ARTICOLO = /^\d{3,4}-\d{4,6}$/
const NUMERO_ORDINE = /^\d+\/\d{4}$/
const SOLO_NUMERO = /^-?\d+(?:[.,]\d+)?$/

export async function leggiRigheInevaso(
  buffer: Buffer,
): Promise<RigaDocumento[]> {
  const righe = raggruppaInRighe(await leggiFrammentiPdf(buffer))
  const intestazione = trovaColonne(righe, COLONNE_INEVASO)

  if (!intestazione) return []

  const confini = calcolaConfini(intestazione.posizioni)

  // Le righe dati sono quelle che iniziano con un numero d'ordine (es. 11745/2026).
  const righeDati = righe
    .filter((riga) => riga.y < intestazione.riga.y)
    .filter((riga) =>
      riga.frammenti.some((f) => NUMERO_ORDINE.test(f.testo)),
    )

  if (righeDati.length === 0) return []

  const descrizioni = raccogliDescrizioni(
    righe,
    righeDati,
    confini,
    intestazione.riga.y,
  )

  return righeDati.map((riga, indice) => {
    const valore = (colonna: string) =>
      riga.frammenti.find(
        (f) => colonnaPiuVicina(f.x, confini) === colonna,
      )?.testo || ""

    // Su quantità e giacenza si accettano solo numeri: evita che un pezzo di
    // indirizzo della destinazione, che sfora a sinistra, venga scambiato per
    // una quantità.
    const numeroDiColonna = (colonna: string) => {
      const frammento = riga.frammenti.find(
        (f) =>
          colonnaPiuVicina(f.x, confini) === colonna &&
          SOLO_NUMERO.test(f.testo),
      )

      return frammento ? numeroItaliano(frammento.testo) : 0
    }

    const codice = riga.frammenti.find((f) =>
      CODICE_ARTICOLO.test(f.testo),
    )?.testo

    return {
      rowNumber: indice + 1,
      supplierCode: codice || null,
      productName: descrizioni.get(riga.y) || "",
      quantity: numeroDiColonna("Qtà Inevaso"),
      numeroOrdine: valore("N° Ordine"),
      dataOrdine: valore("Data"),
    }
  })
}

/**
 * Ricompone la descrizione di ogni articolo: i frammenti della colonna
 * "Prodotto" vengono attribuiti alla riga dati più vicina in verticale.
 */
function raccogliDescrizioni(
  righe: RigaPdf[],
  righeDati: RigaPdf[],
  confini: Record<string, number>,
  yIntestazione: number,
) {
  const pezzi = new Map<number, FrammentoPdf[]>()

  for (const riga of righe) {
    if (riga.y >= yIntestazione) continue

    for (const frammento of riga.frammenti) {
      if (colonnaPiuVicina(frammento.x, confini) !== "Prodotto") continue

      const rigaPiuVicina = righeDati.reduce((migliore, candidata) =>
        Math.abs(candidata.y - frammento.y) < Math.abs(migliore.y - frammento.y)
          ? candidata
          : migliore,
      )

      const elenco = pezzi.get(rigaPiuVicina.y) || []
      elenco.push(frammento)
      pezzi.set(rigaPiuVicina.y, elenco)
    }
  }

  const descrizioni = new Map<number, string>()

  for (const [y, elenco] of pezzi) {
    const testo = elenco
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .map((f) => f.testo)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()

    descrizioni.set(y, testo)
  }

  return descrizioni
}

/**
 * Ogni colonna viene rappresentata dalla posizione della sua intestazione;
 * l'assegnazione avviene poi per vicinanza.
 */
function calcolaConfini(posizioni: Record<string, number>) {
  return { ...posizioni }
}
