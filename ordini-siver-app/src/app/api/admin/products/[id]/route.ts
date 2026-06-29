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

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { id } = await context.params
    const body = await req.json()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if ("name" in body) {
      const name = String(body.name || "").trim()

      if (!name) {
        return NextResponse.json(
          { error: "Il nome del prodotto è obbligatorio." },
          { status: 400 }
        )
      }

      updates.name = name
    }

    if ("supplier_code" in body) {
      updates.supplier_code =
        String(body.supplier_code || "").trim() || null
    }

    if ("internal_code" in body) {
      updates.internal_code =
        String(body.internal_code || "").trim() || null
    }

    if ("barcode" in body) {
      updates.barcode = String(body.barcode || "").trim() || null
    }

    if ("category" in body) {
      updates.category = String(body.category || "").trim() || null
    }

    if ("unit" in body) {
      updates.unit = String(body.unit || "").trim() || null
    }

    if ("price" in body) {
      updates.price = numero(body.price)
      updates.last_price_update = new Date().toISOString()
    }

    if ("vat" in body) {
      updates.vat = numero(body.vat)
    }

    if ("min_stock" in body) {
      updates.min_stock = numero(body.min_stock) ?? 0
    }

    if ("max_stock" in body) {
      updates.max_stock = numero(body.max_stock) ?? 0
    }

    if ("required_stock" in body) {
      updates.required_stock = Boolean(body.required_stock)
    }

    if ("active" in body) {
      updates.active = Boolean(body.active)
    }

    if ("image_url" in body) {
      updates.image_url = String(body.image_url || "").trim() || null
    }

    if ("notes" in body) {
      updates.notes = String(body.notes || "").trim() || null
    }

    const { error } = await supabaseAdmin
      .from("products")
      .update(updates)
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore aggiornamento prodotto.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { id } = await context.params

    const { error } = await supabaseAdmin
      .from("products")
      .update({
        active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore eliminazione prodotto.",
      },
      { status: 500 }
    )
  }
}