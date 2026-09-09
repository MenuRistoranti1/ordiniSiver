import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import pdfParse from "pdf-parse/lib/pdf-parse"
import { leggiDocumento } from "@/lib/document-center/documentParser"
import { leggiFatturaElettronica } from "@/lib/document-center/fatturaElettronica"

export const runtime = "nodejs"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ProcessRequest = {
  documentId: string
}

export async function POST(request: Request) {
  try {
    const { documentId } = (await request.json()) as ProcessRequest

    if (!documentId) {
      return NextResponse.json({ error: "documentId mancante" }, { status: 400 })
    }

    const { data: document, error: documentError } = await supabaseAdmin
      .from("documents")
      .select("id, file_name, file_url")
      .eq("id", documentId)
      .single()

    if (documentError || !document) {
      return NextResponse.json({ error: "Documento non trovato" }, { status: 404 })
    }

    await throwIfError(
      supabaseAdmin
        .from("documents")
        .update({ status: "processing" })
        .eq("id", documentId)
    )

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("documents")
      .download(document.file_url)

    if (downloadError || !fileData) {
      throw new Error("Impossibile scaricare il file dal bucket documents")
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())

    /*
      Gli XML della fattura elettronica sono la fonte migliore: i campi sono
      espliciti e il tipo di documento è dichiarato, quindi una nota di
      credito non può essere scambiata per una consegna. I PDF restano per i
      documenti che arrivano via mail, fra cui gli inevasi, che in XML non
      esistono.
    */
    const isXml = /\.xml$/i.test(document.file_name || "")

    const lettura = isXml
      ? daFatturaElettronica(buffer.toString("utf-8"))
      : await daPdf(buffer)

    const {
      tipo: tipoDocumento,
      righe: rows,
      numero: numeroLetto,
      totale: totaleLetto,
      azienda: aziendaLetta,
      data: dataLetta,
    } = lettura

    const companyName = aziendaLetta ?? findCompanyName(lettura.testo)
    const documentDate = dataLetta ?? findDocumentDate(lettura.testo)
    const documentNumber = numeroLetto ?? findDocumentNumber(lettura.testo)

    // Il totale letto accanto alla sua etichetta è affidabile; il vecchio
    // riconoscimento sul testo produceva importi inesistenti (51.457 € su un
    // inevaso che non ha totali), quindi non viene più usato.
    const totalAmount = totaleLetto

    let restaurantId: string | null = null
    let restaurantName: string | null = null

    if (companyName) {
      const normalizedCompanyName = normalizeCompany(companyName)

      const { data: links, error: linkError } = await supabaseAdmin
        .from("company_restaurant_links")
        .select("company_name, restaurant_id, restaurant_name")
        .eq("active", true)

      if (linkError) throw new Error(linkError.message)

      const link = links?.find(
        (item) => normalizeCompany(item.company_name) === normalizedCompanyName
      )

      if (link) {
        restaurantId = link.restaurant_id
        restaurantName = link.restaurant_name
      }
    }

    await throwIfError(
      supabaseAdmin
        .from("documents")
        .update({
          company_name: companyName,
          document_type: tipoDocumento,
          document_number: documentNumber,
          document_date: documentDate,
          total_amount: totalAmount,
          restaurant_id: restaurantId,
          restaurant_name: restaurantName,
          status: "processed",
          notified: Boolean(restaurantId),
        })
        .eq("id", documentId)
    )

    if (restaurantId && restaurantName) {
      await supabaseAdmin.from("notifications").insert({
        type: "document_uploaded",
        title: "Nuovo documento disponibile",
        message: `È stato caricato un nuovo documento per ${restaurantName}: ${document.file_name}`,
        severity: "info",
        locale_id: restaurantId,
        locale_nome: restaurantName,
        read: false,
        source: "documents",
        source_id: documentId,
      })
    }

    await throwIfError(
      supabaseAdmin.from("document_rows").delete().eq("document_id", documentId)
    )

    if (rows.length > 0) {
      await throwIfError(
        supabaseAdmin.from("document_rows").insert(
          rows.map((row) => ({
            document_id: documentId,
            row_number: row.rowNumber,
            supplier_code: row.supplierCode,
            product_name: row.productName,
            quantity: row.quantity,
            unit_price: row.unitPrice ?? 0,
            total_price: row.totalPrice ?? 0,
            matched_product_id: null,
            matched_product_name: null,
            match_status: "pending",
          }))
        )
      )
    }

    return NextResponse.json({
      ok: true,
      documentId,
      companyName,
      restaurantName,
      documentNumber,
      documentDate,
      totalAmount,
      tipoDocumento,
      rowsInserted: rows.length,
      notified: Boolean(restaurantId),
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore elaborazione" },
      { status: 500 }
    )
  }
}

async function throwIfError(
  query: PromiseLike<{ error: { message: string } | null }>
) {
  const { error } = await query
  if (error) throw new Error(error.message)
}

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim()
}

/*
  Il nome dell'azienda va confrontato ignorando punteggiatura e spazi: la
  stessa societa' compare come "P.M.L. SRL" nei collegamenti e come
  "P.M.& L. S.R.L." sui documenti, e il confronto letterale falliva lasciando
  il documento senza locale assegnato.
*/
function normalizeCompany(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

function findCompanyName(text: string) {
  const companies = [
    "PANE E AMORE SRL",
    "BRAVI BRAVI SRL",
    "BONI E CARI SRL",
    "GESTIONE RISTORANTI SRL",
    "SALVATI ERMINIO SRL",
    "PML SRL",
    "P.M.L. SRL",
    "STEFRAMARC SRL",
    "POVERI NOI SRL",
    "SOLO SOLE SRL",
    "ANCORA NOI SRL",
    "SEMPRE NOI SRL",
    "LA TAVERNA SRL",
    "BRUTTI MA BUONI SRL",
    "GODO ROMA SRL",
    "PAGLIA 40 SRL",
    "TFE ENTERPRISES SRL",
    "VIBRAZIONI SRL",
    "CAMPOMARZIO CATERING SRL",
  ]

  const normalizedText = normalizeCompany(text)

  return (
    companies.find((company) =>
      normalizedText.includes(normalizeCompany(company))
    ) ?? null
  )
}

function findDocumentNumber(text: string) {
  const match = text.match(/\b(\d{4,6}\/20\d{2})\b/)
  return match?.[1] ?? null
}

function findDocumentDate(text: string) {
  const match = text.match(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/)
  if (!match) return null

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

function findTotalAmount(text: string) {
  const upperText = text.toUpperCase()

  const patterns = [
    /TOTALE\s+(?:DOCUMENTO|FATTURA)?\s*€?\s*([0-9.,]+)/i,
    /IMPORTO\s+TOTALE\s*€?\s*([0-9.,]+)/i,
    /TOTALE\s*€?\s*([0-9.,]+)/i,
  ]

  for (const pattern of patterns) {
    const match = upperText.match(pattern)
    if (match?.[1]) return parseItalianNumber(match[1])
  }

  return 0
}

function parseItalianNumber(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".")
  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

async function daPdf(buffer: Buffer) {
  const parsed = await pdfParse(buffer)
  const testo = normalizeText(parsed.text)
  const letto = await leggiDocumento(buffer)

  return {
    tipo: letto.tipo as string,
    righe: letto.righe,
    numero: letto.numero,
    totale: letto.totale,
    azienda: null as string | null,
    data: null as string | null,
    testo,
  }
}

function daFatturaElettronica(contenuto: string) {
  const fattura = leggiFatturaElettronica(contenuto)

  if (!fattura) {
    return {
      tipo: "sconosciuto",
      righe: [],
      numero: null,
      totale: 0,
      azienda: null as string | null,
      data: null as string | null,
      testo: contenuto,
    }
  }

  return {
    tipo: fattura.tipo === "nota_credito" ? "nota_credito" : "fattura",
    righe: fattura.righe,
    numero: fattura.numero,
    totale: fattura.totale,
    // Nell'XML il cliente è dichiarato: non serve cercarlo nel testo.
    azienda: fattura.cliente,
    data: fattura.data,
    testo: contenuto,
  }
}
