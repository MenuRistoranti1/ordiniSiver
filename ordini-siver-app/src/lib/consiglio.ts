/*
  Quantità consigliata per una riga d'ordine.

  Sta qui, e non dentro una pagina, perché lo stesso numero deve comparire
  identico al responsabile che compila l'ordine e all'amministrazione che lo
  controlla prima di mandarlo al fornitore: due conti separati che divergono
  di un pezzo tolgono fiducia a entrambi.

  La regola: si riempie fino al massimo quando la giacenza è scesa sotto il
  minimo, oppure fino alla media degli ultimi ordini. Da quel che serve si
  toglie la merce già ordinata e non ancora arrivata, altrimenti si ordina due
  volte la stessa cosa.
*/

export type DatiConsiglio = {
  giacenza: number
  minStock: number
  maxStock: number
  /** Media degli ultimi ordini dello stesso prodotto. */
  mediaStorica: number
  /** Pezzi di settimane precedenti non ancora consegnati. */
  inArrivo: number
}

export function quantitaConsigliata(dati: DatiConsiglio): number {
  const giacenza = Number(dati.giacenza || 0)
  const media = Number(dati.mediaStorica || 0)
  const min = Number(dati.minStock || 0)
  const max = Number(dati.maxStock || 0)
  const inArrivo = Number(dati.inArrivo || 0)

  const perLaMedia = giacenza < media ? Math.ceil(media - giacenza) : 0
  const perLaSoglia = max > 0 && giacenza < min ? max - giacenza : 0

  return Math.max(0, Math.max(perLaMedia, perLaSoglia) - inArrivo)
}

/**
 * Motivo per cui una quantità ordinata merita una segnalazione, o null se non
 * c'è niente da dire. Non blocca: serve a far decidere con i dati davanti.
 *
 * Ordinare più del consigliato, di per sé, non è un errore: finché si resta
 * sotto il massimo è una scelta legittima di chi sta in sala, e segnalarla
 * ogni volta avrebbe solo insegnato a ignorare gli avvisi. Si segnala quando
 * si supera il massimo, contando anche la merce già in viaggio.
 */
export function motivoSegnalazione(input: {
  ordinata: number
  giacenza: number
  maxStock: number
  inArrivo: number
}): "oltre_massimo" | "oltre_massimo_con_arrivi" | "gia_in_arrivo" | null {
  const ordinata = Number(input.ordinata || 0)
  if (ordinata <= 0) return null

  const max = Number(input.maxStock || 0)
  const giacenza = Number(input.giacenza || 0)
  const inArrivo = Number(input.inArrivo || 0)

  if (max > 0 && giacenza + ordinata > max) return "oltre_massimo"

  if (max > 0 && giacenza + inArrivo + ordinata > max) {
    return "oltre_massimo_con_arrivi"
  }

  if (inArrivo > 0) return "gia_in_arrivo"

  return null
}
