/*
  Lettura di un PDF conservando la posizione del testo.

  I documenti Siver sono tabelle, e il testo lineare non basta per leggerle:
  colonne accostate finiscono incollate senza separatore. Nell'inevaso le
  colonne "Qtà Inevaso" e "Giac" diventano "2-3", che va letto come quantità 2
  e giacenza -3, mentre "10" è 1 e 0: senza le coordinate non c'è modo di
  distinguerli. Nelle fatture succede lo stesso tra descrizione e quantità
  ("Bicch.Casablanca Liquore Cl.3" seguito da 12 diventa "Cl.312").

  Qui il PDF viene letto con pdfjs, che per ogni frammento di testo espone la
  sua posizione: le righe si ricostruiscono raggruppando per coordinata
  verticale, le colonne assegnando ogni frammento all'intestazione più vicina.
*/

export type FrammentoPdf = {
  testo: string
  x: number
  y: number
}

export type RigaPdf = {
  y: number
  frammenti: FrammentoPdf[]
}

/** Tolleranza verticale entro cui due frammenti appartengono alla stessa riga. */
const TOLLERANZA_RIGA = 3

export async function leggiFrammentiPdf(
  buffer: Buffer,
): Promise<FrammentoPdf[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs")

  const documento = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise

  const frammenti: FrammentoPdf[] = []

  for (let numero = 1; numero <= documento.numPages; numero++) {
    const pagina = await documento.getPage(numero)
    const contenuto = await pagina.getTextContent()

    for (const elemento of contenuto.items) {
      if (!("str" in elemento)) continue

      const testo = elemento.str.trim()
      if (!testo) continue

      frammenti.push({
        testo,
        x: Math.round(elemento.transform[4]),
        // Le pagine successive vengono impilate sotto la prima, così l'ordine
        // di lettura resta corretto su documenti multipagina.
        y: Math.round(elemento.transform[5]) - (numero - 1) * 10000,
      })
    }
  }

  return frammenti
}

/** Raggruppa i frammenti in righe, dall'alto verso il basso. */
export function raggruppaInRighe(frammenti: FrammentoPdf[]): RigaPdf[] {
  const ordinati = [...frammenti].sort((a, b) => b.y - a.y || a.x - b.x)
  const righe: RigaPdf[] = []

  for (const frammento of ordinati) {
    const riga = righe.find(
      (item) => Math.abs(item.y - frammento.y) <= TOLLERANZA_RIGA,
    )

    if (riga) {
      riga.frammenti.push(frammento)
      continue
    }

    righe.push({ y: frammento.y, frammenti: [frammento] })
  }

  for (const riga of righe) {
    riga.frammenti.sort((a, b) => a.x - b.x)
  }

  return righe
}

/**
 * Trova la riga di intestazione della tabella e restituisce la posizione
 * orizzontale di ogni colonna cercata.
 */
export function trovaColonne(
  righe: RigaPdf[],
  etichette: string[],
): { riga: RigaPdf; posizioni: Record<string, number> } | null {
  for (const riga of righe) {
    const posizioni: Record<string, number> = {}

    for (const etichetta of etichette) {
      const frammento = riga.frammenti.find(
        (item) =>
          item.testo.toLowerCase().replace(/\s+/g, " ") ===
          etichetta.toLowerCase(),
      )

      if (frammento) posizioni[etichetta] = frammento.x
    }

    if (Object.keys(posizioni).length === etichette.length) {
      return { riga, posizioni }
    }
  }

  return null
}

/**
 * Assegna un frammento alla colonna la cui intestazione è più vicina,
 * confrontando le posizioni orizzontali.
 */
export function colonnaPiuVicina(
  x: number,
  posizioni: Record<string, number>,
): string {
  let migliore = ""
  let distanzaMigliore = Number.POSITIVE_INFINITY

  for (const [nome, posizione] of Object.entries(posizioni)) {
    const distanza = Math.abs(x - posizione)

    if (distanza < distanzaMigliore) {
      distanzaMigliore = distanza
      migliore = nome
    }
  }

  return migliore
}

/** Converte un numero scritto all'italiana ("1.234,56") in numero. */
export function numeroItaliano(valore: string) {
  const pulito = valore.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")
  const numero = Number(pulito)

  return Number.isFinite(numero) ? numero : 0
}
