/*
  Lettura completa di una tabella.

  Il database restituisce al massimo mille righe per richiesta, e non avvisa:
  chi legge senza paginare crede di avere tutto e lavora su una parte. È già
  successo con le giacenze, quasi tremila, dove le righe mancanti risultavano
  a zero e facevano sparire le segnalazioni.

  Si passa una funzione che costruisce la query per un intervallo di righe,
  così restano liberi filtri e ordinamenti:

      const ordini = await leggiTutte((da, a) =>
        supabase.from("ordini").select("*").order("created_at").range(da, a),
      )
*/

const BLOCCO = 1000

type Risposta<T> = { data: T[] | null; error: { message: string } | null }

export async function leggiTutte<T>(
  costruisci: (da: number, a: number) => PromiseLike<Risposta<T>>,
): Promise<T[]> {
  const righe: T[] = []

  for (let da = 0; ; da += BLOCCO) {
    const { data, error } = await costruisci(da, da + BLOCCO - 1)

    if (error) throw new Error(error.message)

    const blocco = data || []
    righe.push(...blocco)

    if (blocco.length < BLOCCO) break
  }

  return righe
}
