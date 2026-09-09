/*
  Lettura della fattura elettronica in formato XML (FatturaPA).

  È la fonte migliore che abbiamo: codice articolo, descrizione, quantità e
  prezzi sono campi espliciti, non testo da ricavare per posizione come nei
  PDF. Sparisce l'ambiguità che rende fragili i parser dei documenti stampati,
  e il formato è lo stesso per qualunque fornitore.

  Soprattutto, il tipo di documento è dichiarato: TD04 è una nota di credito,
  cioè uno storno. Sul PDF di cortesia la differenza non si nota, e leggerla
  come una fattura significherebbe contare come consegnata merce che è stata
  invece resa o annullata.
*/

export type TipoFatturaElettronica = "fattura" | "nota_credito"

export type RigaFatturaElettronica = {
  rowNumber: number
  supplierCode: string | null
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export type FatturaElettronica = {
  tipo: TipoFatturaElettronica
  numero: string | null
  data: string | null
  totale: number
  fornitore: string | null
  cliente: string | null
  righe: RigaFatturaElettronica[]
}

/** TD04 e TD08 sono note di credito: stornano una fattura precedente. */
const TIPI_NOTA_CREDITO = ["TD04", "TD08"]

export function leggiFatturaElettronica(
  contenuto: string,
): FatturaElettronica | null {
  const tipoDocumento = valore(contenuto, "TipoDocumento")

  // Senza tipo documento non è una fattura elettronica valida.
  if (!tipoDocumento) return null

  const denominazioni = tutti(contenuto, "Denominazione")

  return {
    tipo: TIPI_NOTA_CREDITO.includes(tipoDocumento)
      ? "nota_credito"
      : "fattura",
    numero: valore(contenuto, "Numero"),
    data: valore(contenuto, "Data"),
    totale: numero(valore(contenuto, "ImportoTotaleDocumento")),
    // Il primo è chi emette, l'ultimo chi riceve.
    fornitore: denominazioni[0] ?? null,
    cliente: denominazioni.length > 1 ? denominazioni[denominazioni.length - 1] : null,
    righe: leggiRighe(contenuto),
  }
}

function leggiRighe(contenuto: string): RigaFatturaElettronica[] {
  const blocchi = [
    ...contenuto.matchAll(/<DettaglioLinee>([\s\S]*?)<\/DettaglioLinee>/g),
  ]

  return blocchi.map((blocco, indice) => {
    const riga = blocco[1]

    return {
      rowNumber: Number(valore(riga, "NumeroLinea")) || indice + 1,
      supplierCode: valore(riga, "CodiceValore"),
      productName: (valore(riga, "Descrizione") || "").trim(),
      quantity: numero(valore(riga, "Quantita")),
      unitPrice: numero(valore(riga, "PrezzoUnitario")),
      totalPrice: numero(valore(riga, "PrezzoTotale")),
    }
  })
}

/*
  L'XML può arrivare con i tag prefissati dal namespace ("p:FatturaElettronica",
  "ns2:Numero"), quindi il prefisso va ignorato nella ricerca.
*/
function valore(contenuto: string, tag: string): string | null {
  const match = contenuto.match(
    new RegExp(`<(?:[\\w-]+:)?${tag}>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`),
  )

  return match ? decodifica(match[1].trim()) : null
}

/*
  Nell'XML i caratteri speciali sono codificati: "P.M.& L. S.R.L." arriva come
  "P.M.&amp; L. S.R.L.". Senza decodifica il nome non corrisponde a quello dei
  collegamenti azienda-locale e il documento resta senza locale assegnato.
*/
function decodifica(testo: string) {
  return testo
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, codice) => String.fromCharCode(Number(codice)))
}

function tutti(contenuto: string, tag: string): string[] {
  return [
    ...contenuto.matchAll(
      new RegExp(`<(?:[\\w-]+:)?${tag}>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "g"),
    ),
  ].map((m) => decodifica(m[1].trim()))
}

/** Nell'XML i decimali usano il punto, secondo lo standard. */
function numero(valore: string | null): number {
  if (!valore) return 0

  const n = Number(valore.replace(",", "."))
  return Number.isFinite(n) ? n : 0
}
