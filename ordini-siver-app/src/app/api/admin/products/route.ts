import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Manca NEXT_PUBLIC_SUPABASE_URL")
  }

  if (!serviceRoleKey) {
    throw new Error("Manca SUPABASE_SERVICE_ROLE_KEY")
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

function numero(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return null
  }

  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      products: data || [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore caricamento prodotti.",
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await req.json()

    const name = String(body.name || "").trim()

    if (!name) {
      return NextResponse.json(
        { error: "Il nome del prodotto è obbligatorio." },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const price = numero(body.price)

    const { error } = await supabaseAdmin
      .from("products")
      .insert({
        name,
        supplier_code:
          String(body.supplier_code || "").trim() || null,
        internal_code:
          String(body.internal_code || "").trim() || null,
        barcode:
          String(body.barcode || "").trim() || null,
        category:
          String(body.category || "").trim() || null,
        unit:
          String(body.unit || "").trim() || null,
        price,
        vat: numero(body.vat),
        min_stock: numero(body.min_stock) ?? 0,
        max_stock: numero(body.max_stock) ?? 0,
        required_stock: Boolean(body.required_stock),
        active: Boolean(body.active),
        image_url:
          String(body.image_url || "").trim() || null,
        notes:
          String(body.notes || "").trim() || null,
        last_price_update: price !== null ? now : null,
        updated_at: now,
      })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore creazione prodotto.",
      },
      { status: 500 }
    )
  }
}