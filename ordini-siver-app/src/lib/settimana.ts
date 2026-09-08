/*
  Calcolo della settimana operativa, ancorato all'ora italiana.

  Il ciclo va da sabato a venerdì e ogni riga di giacenze/ordini porta una
  "settimana_key". Nel browser dei locali la chiave viene calcolata con l'ora
  locale: si trova il sabato, si azzera l'orario e si converte in stringa ISO.
  Roma è sempre avanti rispetto a UTC, quindi quella conversione arretra di un
  giorno e la chiave salvata cade di venerdì. È così per tutti i dati esistenti
  (2026-09-04, 2026-07-10: entrambi venerdì).

  Lo stesso codice eseguito sul server, che gira in UTC, produrrebbe invece il
  sabato: chi legge da lì non troverebbe mai le righe scritte dai locali. Queste
  funzioni riproducono di proposito la chiave del browser, così che il server
  interroghi esattamente i dati reali.

  Se un domani si vorrà spostare la chiave sul sabato "giusto", andrà fatto
  insieme a una migrazione dei dati storici e al codice client, non qui.
*/

const FUSO_ITALIA = "Europe/Rome"

function dataItaliana(adesso: Date) {
  const parti = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_ITALIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(adesso)

  const [anno, mese, giorno] = parti.split("-").map(Number)

  return { anno, mese, giorno }
}

/** Sabato di apertura della settimana in corso, secondo il calendario italiano. */
export function sabatoCorrente(adesso = new Date()) {
  const { anno, mese, giorno } = dataItaliana(adesso)

  const oggi = new Date(Date.UTC(anno, mese - 1, giorno))
  const giornoSettimana = oggi.getUTCDay()
  const diff = giornoSettimana >= 6 ? giornoSettimana - 6 : giornoSettimana + 1

  return new Date(Date.UTC(anno, mese - 1, giorno - diff))
}

/** Chiave della settimana in corso, nello stesso formato usato dai locali. */
export function settimanaKeyCorrente(adesso = new Date()) {
  const sabato = sabatoCorrente(adesso)

  // Allinea la chiave a quella prodotta dai browser italiani (vedi nota sopra).
  sabato.setUTCDate(sabato.getUTCDate() - 1)

  return sabato.toISOString().split("T")[0]
}

/** Ora del giorno (0-23) in Italia, indipendente dal fuso del server. */
export function oraItaliana(adesso = new Date()) {
  const ora = new Intl.DateTimeFormat("it-IT", {
    timeZone: FUSO_ITALIA,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(adesso)

  return Number(ora)
}
