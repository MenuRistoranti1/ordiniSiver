import { supabase } from "@/lib/supabase"

/*
  Prodotti che compaiono nei documenti del fornitore ma non esistono in
  anagrafica.

  Vale sia per le fatture sia per gli inevasi: un prodotto visto in un inevaso
  può essere codificato subito, così quando arriverà la fattura la riga si
  abbina da sola invece di finire fra la "merce arrivata senza ordine".

  La codifica non è automatica di proposito. Un prodotto creato da un
  documento arriva senza categoria, unità e soglie, e l'anagrafica si
  riempirebbe di acquisti una tantum — bidoni, spazzoloni, ricambi — mescolati
  ai prodotti che i locali tengono davvero a scorta. Chi decide è
  l'amministrazione; qui si prepara solo il lavoro.
*/

export type DaCodificare = {
  supplierCode: string
  nomeProdotto: string
  /** In quanti documenti compare. */
  occorrenze: number
  pezzi: number
  /** Ultimo prezzo visto in fattura; gli inevasi non lo riportano. */
  prezzo: number | null
  ultimaData: string | null
  soloInevasi: boolean
  locali: string[]
}

const norm = (valore: unknown) =>
  String(valore || "").toUpperCase().replace(/\s+/g, "").trim()

export async function caricaDaCodificare(): Promise<DaCodificare[]> {
  const [prodotti, documenti, righe] = await Promise.all([
    leggiTutto("products", "id,supplier_code,active,deleted_at"),
    leggiTutto("documents", "id,document_type,document_date,restaurant_name"),
    leggiTutto("document_rows", "document_id,supplier_code,product_name,quantity,unit_price"),
  ])

  const codificati = new Set(prodotti.map((p) => norm(p.supplier_code)))

  const info = new Map(
    documenti.map((d) => [
      String(d.id),
      {
        tipo: String(d.document_type || ""),
        data: String(d.document_date || ""),
        locale: String(d.restaurant_name || ""),
      },
    ]),
  )

  const mappa = new Map<string, DaCodificare>()

  for (const riga of righe) {
    const codice = norm(riga.supplier_code)
    if (!codice || codificati.has(codice)) continue

    const documento = info.get(String(riga.document_id))
    if (!documento) continue

    const voce =
      mappa.get(codice) ||
      ({
        supplierCode: String(riga.supplier_code),
        nomeProdotto: String(riga.product_name || "Prodotto"),
        occorrenze: 0,
        pezzi: 0,
        prezzo: null,
        ultimaData: null,
        soloInevasi: true,
        locali: [] as string[],
      } as DaCodificare)

    voce.occorrenze += 1
    voce.pezzi += Number(riga.quantity || 0)

    const prezzo = Number(riga.unit_price || 0)

    // Il prezzo lo danno solo le fatture: gli inevasi elencano ciò che manca.
    if (documento.tipo === "fattura") {
      voce.soloInevasi = false

      if (prezzo > 0 && (!voce.ultimaData || documento.data > voce.ultimaData)) {
        voce.prezzo = prezzo
        voce.ultimaData = documento.data
      }
    }

    if (documento.locale && !voce.locali.includes(documento.locale)) {
      voce.locali.push(documento.locale)
    }

    mappa.set(codice, voce)
  }

  // Prima ciò che ricorre di più: è il segno che serve davvero in anagrafica.
  return Array.from(mappa.values()).sort(
    (a, b) => b.occorrenze - a.occorrenze || b.pezzi - a.pezzi,
  )
}

/**
 * Crea il prodotto in anagrafica e collega le righe di documento che lo
 * citavano, così lo storico non resta orfano.
 */
export async function codificaProdotto(input: {
  supplierCode: string
  nomeProdotto: string
  prezzo: number | null
}): Promise<void> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      supplier_code: input.supplierCode,
      name: input.nomeProdotto,
      price: input.prezzo,
      active: true,
      notes: "Creato dai documenti del fornitore",
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  const { error: erroreRighe } = await supabase
    .from("document_rows")
    .update({ matched_product_id: data.id, match_status: "matched" })
    .eq("supplier_code", input.supplierCode)

  if (erroreRighe) throw new Error(erroreRighe.message)
}

/**
 * Codifica in blocco: utile all'avvio, quando l'elenco raccoglie mesi di
 * documenti. A regime i prodotti nuovi sono pochi per volta.
 */
export async function codificaTutti(
  righe: DaCodificare[],
): Promise<{ aggiunti: number; errori: string[] }> {
  const errori: string[] = []
  let aggiunti = 0

  for (const riga of righe) {
    try {
      await codificaProdotto({
        supplierCode: riga.supplierCode,
        nomeProdotto: riga.nomeProdotto,
        prezzo: riga.prezzo,
      })
      aggiunti++
    } catch (errore) {
      errori.push(
        `${riga.supplierCode}: ${errore instanceof Error ? errore.message : "errore"}`,
      )
    }
  }

  return { aggiunti, errori }
}

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
