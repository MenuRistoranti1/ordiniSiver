import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const pdf = require("pdf-parse/lib/pdf-parse.js")

export const runtime = "nodejs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey)

function numeroIT(value: string) {
  const cleaned = String(value || "")
    .replace("€", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim()

  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function euro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0)
}

function parseInvoiceInfo(text: string) {
  const invoiceMatch =
    text.match(/Fattura\s+Accompagnatoria\s+N[°º]?\s*([0-9A-Z\/]+)/i) ||
    text.match(/N[°º]?\s*([0-9]{3,}\/\d+[A-Z]?)/i)

  const dateMatch =
    text.match(/Data\s+(\d{2}\/\d{2}\/\d{4})/i) ||
    text.match(/(\d{2}\/\d{2}\/\d{4})/)

  const destinationMatch = text.match(
    /Destinazione\s+Merce\s+(.+?)(?:\n|SDI:|Fattura)/i
  )

  return {
    invoice_number: invoiceMatch?.[1] || null,
    invoice_date: dateMatch?.[1] || null,
    destination: destinationMatch?.[1]?.trim() || null,
  }
}

function parseValoriRigaSiver(valori: string) {
  const clean = String(valori || "").replace(/\s+/g, "")

  const match = clean.match(
    /^(\d+)([0-9]+,[0-9]+)€?([0-9]+(?:[\.,][0-9]+)?)%([0-9]+,[0-9]+)€?([0-9]+,[0-9]+)$/i
  )

  if (!match) return null

  const qtyPrice = match[1] + match[2]
  const discount = numeroIT(match[3])
  const total = numeroIT(match[4])
  const vat = numeroIT(match[5])

  const commaIndex = qtyPrice.indexOf(",")
  const beforeComma = qtyPrice.slice(0, commaIndex)
  const decimals = qtyPrice.slice(commaIndex + 1)

  let best: any = null

  for (let split = 1; split < beforeComma.length; split++) {
    const qtyText = beforeComma.slice(0, split)
    const priceText = beforeComma.slice(split) + "," + decimals

    const quantity = numeroIT(qtyText)
    const price = numeroIT(priceText)

    if (!quantity || !price) continue

    const expectedTotal = quantity * price * (1 - discount / 100)
    const diff = Math.abs(expectedTotal - total)

    if (!best || diff < best.diff) {
      best = {
        quantity,
        price,
        discount,
        total,
        vat,
        diff,
      }
    }
  }

  return best
}

function parseRows(text: string) {
  const rows: any[] = []

  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  for (let i = 0; i < lines.length - 2; i++) {
    const codice = lines[i]
    const nome = lines[i + 1]
    const valori = lines[i + 2]

    const isCodice = /^[0-9A-Z]{2,}[-\/][0-9A-Z\-\/]+$/i.test(codice)

    if (!isCodice) continue
    if (!nome || nome.toLowerCase().includes("codice")) continue

    const parsed = parseValoriRigaSiver(valori)

    if (!parsed) continue

    rows.push({
      supplier_code: codice.trim(),
      product_name: nome.trim(),
      quantity: parsed.quantity,
      price: parsed.price,
      discount: parsed.discount,
      total: parsed.total,
      vat: parsed.vat,
    })
  }

  return rows
}

async function creaNotifica({
  type,
  title,
  message,
  severity = "info",
  source = "import-invoice-pdf",
  source_id,
}: {
  type: string
  title: string
  message: string
  severity?: string
  source?: string
  source_id: string
}) {
  const { data: esistente } = await supabase
    .from("notifications")
    .select("id")
    .eq("type", type)
    .eq("source", source)
    .eq("source_id", source_id)
    .eq("read", false)
    .maybeSingle()

  if (esistente?.id) return

  await supabase.from("notifications").insert({
    type,
    title,
    message,
    severity,
    read: false,
    source,
    source_id,
  })
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Variabili Supabase mancanti nel .env.local" },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "File PDF mancante" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await pdf(buffer)
    const text = parsed.text || ""

    const invoice = parseInvoiceInfo(text)
    const rows = parseRows(text)

    if (rows.length === 0) {
      console.log("TESTO PDF:", text.slice(0, 3000))

      return NextResponse.json(
        {
          error:
            "Non ho trovato righe prodotto nel PDF. Probabile formato diverso o PDF scannerizzato.",
          text_preview: text.slice(0, 1500),
        },
        { status: 400 }
      )
    }

    let updated = 0
    let created = 0
    let important_changes = 0

    const enrichedRows = []

    for (const row of rows) {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, supplier_code, price, active")
        .eq("supplier_code", row.supplier_code)
        .eq("active", true)

      if (error) {
        console.log(error)
        continue
      }

      let product = (products || [])[0]

      if (!product) {
        const { data: nuovoProdotto, error: insertError } = await supabase
          .from("products")
          .insert({
            supplier_code: row.supplier_code,
            name: row.product_name,
            price: row.price,
            active: true,
            category: "Import PDF",
            unit: "pz",
          })
          .select("id, name, supplier_code, price, active")
          .single()

        if (insertError) {
          console.log(insertError)
          continue
        }

        product = nuovoProdotto
        created++

        await creaNotifica({
          type: "product_created_from_invoice",
          title: "Nuovo prodotto creato da fattura",
          message: `${row.product_name} (${row.supplier_code}) creato automaticamente dalla fattura.`,
          severity: "success",
          source: "products",
          source_id: `new-${row.supplier_code}`,
        })

        await supabase.from("invoice_import_rows").insert({
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          product_id: product.id,
          supplier_code: row.supplier_code,
          product_name: row.product_name,
          quantity: row.quantity,
          price: row.price,
          total: row.total,
          matched: true,
          anomaly: false,
          anomaly_note: "Nuovo prodotto creato automaticamente",
        })

        enrichedRows.push({
          ...row,
          matched: true,
          created: true,
          product_id: product.id,
          old_price: null,
          variation_percent: null,
        })

        continue
      }

      const oldPrice = Number(product.price || 0)
      const variation =
        oldPrice > 0 ? ((row.price - oldPrice) / oldPrice) * 100 : 0

      const { error: updateError } = await supabase
        .from("products")
        .update({
          price: row.price,
          name: product.name || row.product_name,
          active: true,
        })
        .eq("id", product.id)

      if (updateError) {
        console.log(updateError)
        continue
      }

      updated++

      await supabase.from("invoice_import_rows").insert({
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        product_id: product.id,
        supplier_code: row.supplier_code,
        product_name: row.product_name,
        quantity: row.quantity,
        price: row.price,
        total: row.total,
        matched: true,
        anomaly: Math.abs(variation) >= 10,
        anomaly_note:
          Math.abs(variation) >= 10
            ? `Variazione prezzo ${variation.toFixed(1)}%`
            : null,
      })

      if (oldPrice > 0 && Math.abs(variation) >= 10) {
        important_changes++

        await supabase.from("product_price_history").insert({
          product_id: product.id,
          supplier_code: product.supplier_code,
          product_name: product.name || row.product_name,
          old_price: oldPrice,
          new_price: row.price,
          variation_percent: variation,
          invoice_number: invoice.invoice_number,
          source: "import_fattura_pdf",
        })

        await creaNotifica({
          type: variation > 0 ? "price_increase" : "price_decrease",
          title:
            variation > 0
              ? "Aumento prezzo da fattura"
              : "Diminuzione prezzo da fattura",
          message: `${product.name || row.product_name}: da ${euro(
            oldPrice
          )} a ${euro(row.price)} (${variation.toFixed(1)}%). Fattura ${
            invoice.invoice_number || ""
          }`,
          severity: variation > 0 ? "danger" : "info",
          source: "product_price_history",
          source_id: `pdf-price-${product.id}-${oldPrice}-${row.price}`,
        })
      }

      enrichedRows.push({
        ...row,
        matched: true,
        created: false,
        product_id: product.id,
        old_price: oldPrice,
        variation_percent: oldPrice > 0 ? variation : null,
      })
    }

    await creaNotifica({
      type: "invoice_pdf_import_completed",
      title: "Import fattura PDF completato",
      message: `Fattura ${invoice.invoice_number || ""}: ${
        rows.length
      } righe lette, ${updated} aggiornate, ${created} nuovi prodotti, ${important_changes} variazioni importanti.`,
      severity: created > 0 || important_changes > 0 ? "warning" : "success",
      source_id: `pdf-${invoice.invoice_number || Date.now()}`,
    })

    return NextResponse.json({
      invoice,
      rows: enrichedRows,
      rows_count: rows.length,
      updated,
      created,
      not_found: 0,
      important_changes,
    })
  } catch (error: any) {
    console.log(error)

    return NextResponse.json(
      { error: error?.message || "Errore import fattura PDF" },
      { status: 500 }
    )
  }
}