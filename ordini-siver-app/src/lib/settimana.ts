/*
  Settimana operativa, secondo il calendario ISO: da lunedì a domenica.

  La chiave (`settimana_key`) è la data del lunedì di apertura, in formato
  AAAA-MM-GG. È la stessa convenzione dei fogli usati in amministrazione, dove
  ogni colonna porta il lunedì della sua settimana.

  Tutto è ancorato al fuso italiano e calcolato su componenti di data, non su
  orari: il server gira in UTC e i browser in ora locale, e un calcolo basato
  sull'orario produrrebbe chiavi diverse nei due ambienti — cosa che in
  passato aveva già spostato le chiavi di un giorno indietro.
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

/** Lunedì di apertura della settimana che contiene la data indicata. */
export function lunediDellaSettimana(adesso = new Date()) {
  const { anno, mese, giorno } = dataItaliana(adesso)

  const data = new Date(Date.UTC(anno, mese - 1, giorno))
  const giornoSettimana = data.getUTCDay()

  // getUTCDay(): domenica = 0. In ISO la domenica chiude la settimana, quindi
  // torna indietro di sei giorni invece che restare sulla settimana dopo.
  const scarto = giornoSettimana === 0 ? 6 : giornoSettimana - 1

  return new Date(Date.UTC(anno, mese - 1, giorno - scarto))
}

/** Chiave della settimana in corso: la data del lunedì. */
export function settimanaKeyCorrente(adesso = new Date()) {
  return lunediDellaSettimana(adesso).toISOString().split("T")[0]
}

/** Chiave della settimana che contiene una data qualsiasi. */
export function settimanaKeyDiData(data: Date) {
  const scarto = data.getUTCDay() === 0 ? 6 : data.getUTCDay() - 1

  const lunedi = new Date(
    Date.UTC(
      data.getUTCFullYear(),
      data.getUTCMonth(),
      data.getUTCDate() - scarto,
    ),
  )

  return lunedi.toISOString().split("T")[0]
}

/** Lunedì della settimana successiva: quando si potrà inserire di nuovo. */
export function prossimaSettimana(adesso = new Date()) {
  const lunedi = lunediDellaSettimana(adesso)
  lunedi.setUTCDate(lunedi.getUTCDate() + 7)
  return lunedi
}

/** Periodo leggibile della settimana in corso, es. "07 set – 13 set 2026". */
export function periodoSettimana(adesso = new Date()) {
  const inizio = lunediDellaSettimana(adesso)
  const fine = new Date(inizio)
  fine.setUTCDate(inizio.getUTCDate() + 6)

  const formato = (data: Date, conAnno = false) =>
    data.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: conAnno ? "numeric" : undefined,
      timeZone: "UTC",
    })

  return `${formato(inizio)} – ${formato(fine, true)}`
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
