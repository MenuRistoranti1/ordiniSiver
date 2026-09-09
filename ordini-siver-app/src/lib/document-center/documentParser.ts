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
  /**
   * Quantità della riga: nell'inevaso è quanto NON è stato consegnato,
   * nella fattura è quanto è arrivato.
   */
  quantity: number
  /** Solo nelle fatture. */
  unitPrice?: number
  totalPrice?: number
  /** Solo negli inevasi: riferimento all'ordine Siver originale. */
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

/*
  Codice articolo Siver: cifre, trattino, cifre. La parte iniziale va da due a
  quattro cifre (es. 00-28952, 130-55853, 2838-05979): all'inizio era limitata
  a tre e le righe con codice a due cifre restavano senza codice.
*/
const CODICE_ARTICOLO = /^\d{2,4}-\d{4,6}$/
const NUMERO_ORDINE = /^\d+\/\d{4}$/
const SOLO_NUMERO = /^-?\d+(?:[.,]\d+)?$/

/*
  Distanza verticale massima tra la riga dei dati e un pezzo della sua
  descrizione. Nei documenti Siver la descrizione sta 4-5 punti sopra o sotto;
  senza questo limite il piè di pagina, che cade nella stessa colonna, verrebbe
  attribuito all'ultima riga ("...Forchettina Dolce stampato da: ...").
*/
const DISTANZA_MASSIMA_DESCRIZIONE = 20

export async function leggiRigheInevaso(
  buffer: Buffer,
): Promise<RigaDocumento[]> {
  const righe = raggruppaInRighe(await leggiFrammentiPdf(buffer))
  const intestazione = trovaColonne(righe, COLONNE_INEVASO)

  if (!intestazione) return []

  const confini = intestazione.posizioni

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

    const codice = riga.frammenti.find(
      (f) =>
        CODICE_ARTICOLO.test(f.testo) &&
        colonnaPiuVicina(f.x, confini) === "Codice",
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

/*
  Secondo formato di inevaso, intestato "Ordine Inevaso". Stesso contenuto del
  precedente ma tabella diversa: la quantità mancante si chiama RESIDUO, la
  giacenza del fornitore GIACENZA (da ignorare, come nell'altro formato) e
  TOT CONS riporta il consegnato nella forma "0 su 36".
*/
const COLONNE_ORDINE_INEVASO = [
  "COD. ARTICOLO",
  "PRODOTTO",
  "RESIDUO",
  "GIACENZA",
  "TOT CONS",
  "PREZZO",
  "TOTALE",
]

const COLONNE_FATTURA = [
  "CODICE",
  "PRODOTTO",
  "QTÁ",
  "PREZZO",
  "% SC",
  "TOTALE",
  "IVA",
]

/**
 * Righe di una fattura: qui la quantità è la merce effettivamente consegnata.
 * Vale la stessa avvertenza dell'inevaso — nel testo lineare la quantità si
 * incolla alla descrizione ("Cl.3" + 12 diventa "Cl.312") — quindi anche qui
 * si legge per posizione.
 */
export async function leggiRigheFattura(
  buffer: Buffer,
): Promise<RigaDocumento[]> {
  const righe = raggruppaInRighe(await leggiFrammentiPdf(buffer))
  const intestazione = trovaColonne(righe, COLONNE_FATTURA)

  if (!intestazione) return []

  const confini = intestazione.posizioni

  const righeDati = righe
    .filter((riga) => riga.y < intestazione.riga.y)
    .filter((riga) =>
      riga.frammenti.some(
        (f) =>
          CODICE_ARTICOLO.test(f.testo) &&
          colonnaPiuVicina(f.x, confini) === "CODICE",
      ),
    )

  if (righeDati.length === 0) return []

  const descrizioni = raccogliDescrizioni(
    righe,
    righeDati,
    confini,
    intestazione.riga.y,
    "PRODOTTO",
  )

  return righeDati.map((riga, indice) => {
    const numeroDiColonna = (colonna: string) => {
      const frammento = riga.frammenti.find(
        (f) =>
          colonnaPiuVicina(f.x, confini) === colonna &&
          SOLO_NUMERO.test(f.testo.replace(/[€\s]/g, "")),
      )

      return frammento ? numeroItaliano(frammento.testo) : 0
    }

    return {
      rowNumber: indice + 1,
      supplierCode:
        riga.frammenti.find((f) => CODICE_ARTICOLO.test(f.testo))?.testo || null,
      productName: descrizioni.get(riga.y) || "",
      quantity: numeroDiColonna("QTÁ"),
      unitPrice: numeroDiColonna("PREZZO"),
      totalPrice: numeroDiColonna("TOTALE"),
    }
  })
}

/** Righe di un "Ordine Inevaso": il residuo è ciò che non è stato consegnato. */
export async function leggiRigheOrdineInevaso(
  buffer: Buffer,
): Promise<RigaDocumento[]> {
  const righe = raggruppaInRighe(await leggiFrammentiPdf(buffer))
  const intestazione = trovaColonne(righe, COLONNE_ORDINE_INEVASO)

  if (!intestazione) return []

  const confini = intestazione.posizioni

  const righeDati = righe
    .filter((riga) => riga.y < intestazione.riga.y)
    .filter((riga) =>
      riga.frammenti.some(
        (f) =>
          CODICE_ARTICOLO.test(f.testo) &&
          colonnaPiuVicina(f.x, confini) === "COD. ARTICOLO",
      ),
    )

  if (righeDati.length === 0) return []

  const descrizioni = raccogliDescrizioni(
    righe,
    righeDati,
    confini,
    intestazione.riga.y,
    "PRODOTTO",
  )

  return righeDati.map((riga, indice) => {
    const frammentoNumerico = (colonna: string) =>
      riga.frammenti.find(
        (f) =>
          colonnaPiuVicina(f.x, confini) === colonna &&
          SOLO_NUMERO.test(f.testo.replace(/[€\s]/g, "")),
      )

    return {
      rowNumber: indice + 1,
      supplierCode:
        riga.frammenti.find(
          (f) =>
            CODICE_ARTICOLO.test(f.testo) &&
            colonnaPiuVicina(f.x, confini) === "COD. ARTICOLO",
        )?.testo || null,
      productName: descrizioni.get(riga.y) || "",
      quantity: numeroItaliano(frammentoNumerico("RESIDUO")?.testo || "0"),
      unitPrice: numeroItaliano(frammentoNumerico("PREZZO")?.testo || "0"),
      totalPrice: numeroItaliano(frammentoNumerico("TOTALE")?.testo || "0"),
    }
  })
}

/*
  Terzo formato: la fattura elettronica scaricata dal cassetto fiscale, che
  ha un'impaginazione tutta sua. È una fonte preziosa perché lì ci sono
  *tutte* le fatture emesse, comprese quelle che non arrivano via mail.

  Rispetto ai documenti Siver le quantità sono decimali all'italiana
  ("24,00") e ogni riga è seguita da righe di servizio - "(CODICE)",
  "Tipo dato", "Rif. testo" - che cadono nella colonna della descrizione e
  vanno tenute fuori.
*/
const COLONNE_CASSETTO = [
  "Cod. articolo",
  "Descrizione",
  "Quantità",
  "Prezzo unitario",
  "%IVA",
  "Prezzo totale",
]

const RIGHE_DI_SERVIZIO = /^\(CODICE\)|^Tipo dato|^Rif\. testo|^Vs\.Ord|^-{3,}/i

export async function leggiRigheFatturaCassetto(
  buffer: Buffer,
): Promise<RigaDocumento[]> {
  const righe = raggruppaInRighe(await leggiFrammentiPdf(buffer))
  const intestazione = trovaColonne(righe, COLONNE_CASSETTO)

  if (!intestazione) return []

  /*
    Qui i valori non sono allineati alle intestazioni: la descrizione sta a
    sinistra della propria colonna e la quantità a destra, tanto che
    assegnandoli per vicinanza finirebbero nella colonna sbagliata. Si leggono
    quindi per posizione relativa: codice a sinistra, poi la descrizione, e
    infine i numeri in fila - quantità, prezzo, IVA, totale - saltando lo
    sconto, che è l'unico a portare il segno di percentuale.
  */
  const FINE_DESCRIZIONE = 270

  const righeDati = righe
    .filter((riga) => riga.y < intestazione.riga.y)
    .filter((riga) => riga.frammenti.some((f) => CODICE_ARTICOLO.test(f.testo)))

  return righeDati.map((riga, indice) => {
    const numeri = riga.frammenti
      .filter((f) => f.x > FINE_DESCRIZIONE)
      .filter((f) => !f.testo.includes("%"))
      .filter((f) => /^[\d.,]+$/.test(f.testo))
      .sort((a, b) => a.x - b.x)
      .map((f) => numeroItaliano(f.testo))

    const descrizione = riga.frammenti
      .filter(
        (f) =>
          f.x > 60 &&
          f.x < FINE_DESCRIZIONE &&
          !CODICE_ARTICOLO.test(f.testo) &&
          !RIGHE_DI_SERVIZIO.test(f.testo),
      )
      .map((f) => f.testo)
      .join(" ")
      .trim()

    return {
      rowNumber: indice + 1,
      supplierCode:
        riga.frammenti.find((f) => CODICE_ARTICOLO.test(f.testo))?.testo || null,
      productName: descrizione,
      quantity: numeri[0] ?? 0,
      unitPrice: numeri[1] ?? 0,
      // L'ultimo numero della riga è il totale; il penultimo è l'aliquota IVA.
      totalPrice: numeri.length > 0 ? numeri[numeri.length - 1] : 0,
    }
  })
}

export type TipoDocumento = "fattura" | "inevaso" | "sconosciuto"

export type DocumentoLetto = {
  tipo: TipoDocumento
  righe: RigaDocumento[]
  numero: string | null
  totale: number
}

/*
  Numero e totale vanno letti accanto alla loro etichetta, non cercando la
  parola "TOTALE" nel testo: quella parola compare anche come intestazione di
  colonna, e sul testo lineare finiva per agganciare cifre di altre righe
  producendo importi inventati (51.457 € su un inevaso che non ha totali).
*/
const ETICHETTE_NUMERO = ["Fattura Accompagnatoria", "Numero"]

const ETICHETTE_TOTALE = [
  "Totale Fattura",
  "Totale a Pagare",
  "Totale Ordine Inevaso",
]

/*
  Restituisce i frammenti che stanno a destra di un'etichetta, nella stessa
  riga. Sulla stessa riga possono trovarsene diversi - accanto al numero della
  fattura c'è anche la sua data - quindi la scelta viene lasciata a chi chiama.
*/
function valoriAccantoA(righe: RigaPdf[], etichetta: string): string[] {
  for (const riga of righe) {
    const posizione = riga.frammenti.findIndex(
      (f) => f.testo.toLowerCase() === etichetta.toLowerCase(),
    )

    if (posizione === -1) continue

    return riga.frammenti.slice(posizione + 1).map((f) => f.testo)
  }

  return []
}

/*
  Nella fattura del cassetto fiscale il valore sta nella riga sotto la sua
  etichetta, incolonnato con essa, invece che di fianco.
*/
function valoreSottoA(
  righe: RigaPdf[],
  etichetta: string,
  accettabile: (testo: string) => boolean = () => true,
) {
  const indice = righe.findIndex((riga) =>
    riga.frammenti.some((f) => f.testo.toLowerCase() === etichetta.toLowerCase()),
  )

  if (indice === -1) return null

  const riferimento = righe[indice].frammenti.find(
    (f) => f.testo.toLowerCase() === etichetta.toLowerCase(),
  )

  if (!riferimento) return null

  /*
    Si scorrono le righe successive scartando quelle che non contengono un
    valore accettabile: le intestazioni lunghe vanno a capo ("Numero
    documento" occupa due righe) e senza questo controllo si prenderebbe la
    seconda metà dell'etichetta al posto del valore.
  */
  for (const riga of righe.slice(indice + 1, indice + 5)) {
    const vicino = riga.frammenti
      .filter((f) => Math.abs(f.x - riferimento.x) < 130)
      .filter((f) => accettabile(f.testo))
      .sort(
        (a, b) =>
          Math.abs(a.x - riferimento.x) - Math.abs(b.x - riferimento.x),
      )[0]

    if (vicino) return vicino.testo
  }

  return null
}

function leggiNumeroDocumento(righe: RigaPdf[]) {
  // Il numero può avere una lettera finale (19076/26I) o l'anno per esteso
  // (20493/2026); la data che lo affianca ha due barre e resta esclusa.
  const formatoNumero = /^\d+\/\d{2,4}[A-Z]?$/i

  for (const etichetta of ETICHETTE_NUMERO) {
    const valore = valoriAccantoA(righe, etichetta).find((testo) =>
      formatoNumero.test(testo),
    )

    if (valore) return valore
  }

  const sotto = valoreSottoA(righe, "Numero documento", (testo) =>
    formatoNumero.test(testo),
  )

  if (sotto) return sotto

  return null
}

function leggiTotaleDocumento(righe: RigaPdf[]) {
  for (const etichetta of ETICHETTE_TOTALE) {
    for (const valore of valoriAccantoA(righe, etichetta)) {
      if (!/\d/.test(valore)) continue

      const numero = numeroItaliano(valore)
      if (numero > 0) return numero
    }
  }

  const sotto = valoreSottoA(righe, "Totale documento", (testo) =>
    /^[\d.,]+$/.test(testo),
  )

  if (sotto) {
    const numero = numeroItaliano(sotto)
    if (numero > 0) return numero
  }

  return 0
}

/**
 * Riconosce da solo se il PDF è una fattura o un inevaso e ne legge le righe.
 *
 * Il riconoscimento guarda le intestazioni della tabella, non il nome del
 * file: un documento rinominato o salvato da un'altra postazione viene letto
 * lo stesso, e se il formato cambiasse ce ne accorgeremmo subito perché il
 * tipo tornerebbe "sconosciuto" invece di produrre righe sbagliate.
 */
export async function leggiDocumento(
  buffer: Buffer,
): Promise<DocumentoLetto> {
  const righe = raggruppaInRighe(await leggiFrammentiPdf(buffer))

  const intestazione = {
    numero: leggiNumeroDocumento(righe),
    totale: leggiTotaleDocumento(righe),
  }

  if (trovaColonne(righe, COLONNE_INEVASO)) {
    return {
      tipo: "inevaso",
      righe: await leggiRigheInevaso(buffer),
      ...intestazione,
    }
  }

  if (trovaColonne(righe, COLONNE_ORDINE_INEVASO)) {
    return {
      tipo: "inevaso",
      righe: await leggiRigheOrdineInevaso(buffer),
      ...intestazione,
    }
  }

  if (trovaColonne(righe, COLONNE_FATTURA)) {
    return {
      tipo: "fattura",
      righe: await leggiRigheFattura(buffer),
      ...intestazione,
    }
  }

  if (trovaColonne(righe, COLONNE_CASSETTO)) {
    return {
      tipo: "fattura",
      righe: await leggiRigheFatturaCassetto(buffer),
      ...intestazione,
    }
  }

  return { tipo: "sconosciuto", righe: [], ...intestazione }
}

/**
 * Ricompone la descrizione di ogni articolo: i frammenti della colonna
 * del prodotto vengono attribuiti alla riga dati più vicina in verticale.
 */
function raccogliDescrizioni(
  righe: RigaPdf[],
  righeDati: RigaPdf[],
  confini: Record<string, number>,
  yIntestazione: number,
  colonnaProdotto = "Prodotto",
) {
  const pezzi = new Map<number, FrammentoPdf[]>()

  for (const riga of righe) {
    if (riga.y >= yIntestazione) continue

    for (const frammento of riga.frammenti) {
      if (colonnaPiuVicina(frammento.x, confini) !== colonnaProdotto) continue

      const rigaPiuVicina = righeDati.reduce((migliore, candidata) =>
        Math.abs(candidata.y - frammento.y) < Math.abs(migliore.y - frammento.y)
          ? candidata
          : migliore,
      )

      if (
        Math.abs(rigaPiuVicina.y - frammento.y) > DISTANZA_MASSIMA_DESCRIZIONE
      ) {
        continue
      }

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
