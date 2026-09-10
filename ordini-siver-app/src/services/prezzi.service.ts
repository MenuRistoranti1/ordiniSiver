import { supabase } from "@/lib/supabase"

/*
  Andamento prezzi del fornitore.

  Non serve una fotografia periodica: ogni riga di fattura porta con sé prezzo
  e data, quindi la serie storica si ricostruisce quando la si guarda, anche
  all'indietro. Caricando domani le fatture di giugno, l'andamento da giugno
  compare da solo — cosa che una fotografia mensile non potrebbe fare.

  Il confronto che conta è fra il prezzo in anagrafica, quello con cui si
  ragiona, e l'ultimo prezzo effettivamente fatturato. Lo scostamento diventa
  significativo solo moltiplicato per i volumi: un aumento del 12% su un
  prodotto ordinato a decine pesa quanto un raddoppio su un pezzo singolo.
*/

export type PrezzoOsservato = {
  data: string
  prezzo: number
  documento: string | null
  quantita: number
}

export type AndamentoPrezzo = {
  productId: string | null
  supplierCode: string
  nomeProdotto: string
  prezzoAnagrafica: number | null
  ultimoPrezzo: number
  ultimaData: string
  /** Differenza percentuale fra anagrafica e ultimo fatturato. */
  scostamento: number | null
  /** Pezzi acquistati nel periodo osservato. */
  pezzi: number
  /** Quanto pesa lo scostamento sui volumi acquistati. */
  impatto: number | null
  storico: PrezzoOsservato[]
}

const norm = (valore: unknown) =>
  String(valore || "").toUpperCase().replace(/\s+/g, "").trim()

export async function caricaAndamentoPrezzi(): Promise<AndamentoPrezzo[]> {
  const [prodotti, documenti, righe] = await Promise.all([
    leggiTutto("products", "id,name,supplier_code,price,active"),
    leggiTutto("documents", "id,document_type,document_date,document_number"),
    leggiTutto("document_rows", "document_id,supplier_code,product_name,unit_price,quantity"),
  ])

  const fatture = new Map(
    documenti
      .filter((d) => d.document_type === "fattura")
      .map((d) => [
        String(d.id),
        { data: String(d.document_date || ""), numero: d.document_number as string | null },
      ]),
  )

  const serie = new Map<string, { nome: string; punti: PrezzoOsservato[] }>()

  for (const riga of righe) {
    const documento = fatture.get(String(riga.document_id))
    const codice = norm(riga.supplier_code)
    const prezzo = Number(riga.unit_price || 0)

    if (!documento || !codice || prezzo <= 0 || !documento.data) continue

    const voce = serie.get(codice) || {
      nome: String(riga.product_name || "Prodotto"),
      punti: [] as PrezzoOsservato[],
    }

    voce.punti.push({
      data: documento.data,
      prezzo,
      documento: documento.numero,
      quantita: Number(riga.quantity || 0),
    })

    serie.set(codice, voce)
  }

  const prodottiPerCodice = new Map(
    prodotti
      .filter((p) => p.active !== false)
      .map((p) => [norm(p.supplier_code), p]),
  )

  const risultato: AndamentoPrezzo[] = []

  for (const [codice, voce] of serie) {
    const punti = voce.punti.sort((a, b) => a.data.localeCompare(b.data))
    const ultimo = punti[punti.length - 1]
    const prodotto = prodottiPerCodice.get(codice)

    const prezzoAnagrafica = prodotto?.price ? Number(prodotto.price) : null
    const pezzi = punti.reduce((somma, p) => somma + p.quantita, 0)

    const scostamento =
      prezzoAnagrafica && prezzoAnagrafica > 0
        ? ((ultimo.prezzo - prezzoAnagrafica) / prezzoAnagrafica) * 100
        : null

    risultato.push({
      productId: prodotto ? String(prodotto.id) : null,
      supplierCode: String(prodotto?.supplier_code || codice),
      nomeProdotto: String(prodotto?.name || voce.nome),
      prezzoAnagrafica,
      ultimoPrezzo: ultimo.prezzo,
      ultimaData: ultimo.data,
      scostamento,
      pezzi,
      impatto:
        prezzoAnagrafica && prezzoAnagrafica > 0
          ? (ultimo.prezzo - prezzoAnagrafica) * pezzi
          : null,
      storico: punti,
    })
  }

  // Prima i prodotti che pesano di più in euro, poi quelli senza confronto.
  return risultato.sort(
    (a, b) => Math.abs(b.impatto ?? -1) - Math.abs(a.impatto ?? -1),
  )
}

/** Porta il prezzo in anagrafica a quello dell'ultima fattura. */
export async function allineaPrezzo(input: {
  productId: string
  prezzo: number
  prezzoPrecedente: number | null
  documento: string | null
}): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ price: input.prezzo })
    .eq("id", input.productId)

  if (error) throw new Error(error.message)

  // Traccia da dove viene il nuovo prezzo: fra sei mesi deve restare chiaro.
  await supabase.from("product_price_history").insert({
    product_id: input.productId,
    old_price: input.prezzoPrecedente,
    new_price: input.prezzo,
    source: input.documento ? `fattura ${input.documento}` : "allineamento manuale",
  })
}

/*
  Supabase restituisce al massimo mille righe per chiamata: con le righe dei
  documenti si supera in fretta, e una lettura secca ne perderebbe una parte
  senza segnalare nulla.
*/
async function leggiTutto(tabella: string, select: string) {
  const righe: Record<string, unknown>[] = []

  for (let da = 0; ; da += 1000) {
    const { data, error } = await supabase
      .from(tabella)
      .select(select)
      .range(da, da + 999)

    if (error) throw new Error(error.message)

    const blocco = (data || []) as unknown as Record<string, unknown>[]
    righe.push(...blocco)

    if (blocco.length < 1000) break
  }

  return righe
}
