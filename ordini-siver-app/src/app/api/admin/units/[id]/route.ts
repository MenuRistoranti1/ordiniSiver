import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error("Manca NEXT_PUBLIC_SUPABASE_URL")
  if (!serviceRoleKey) throw new Error("Manca SUPABASE_SERVICE_ROLE_KEY")

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { id } = await context.params
    const body = await req.json()

    const updates: Record<string, unknown> = {}

    if ("code" in body) {
      const code = String(body.code || "").trim().toUpperCase()

      if (!code) {
        return NextResponse.json(
          { error: "Il codice unità è obbligatorio." },
          { status: 400 }
        )
      }

      updates.code = code
    }

    if ("description" in body) {
      updates.description = String(body.description || "").trim() || null
    }

    if ("active" in body) {
      updates.active = Boolean(body.active)
    }

    const { error } = await supabaseAdmin
      .from("units")
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
            : "Errore aggiornamento unità.",
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
      .from("units")
      .update({
        active: false,
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
          error instanceof Error ? error.message : "Errore eliminazione unità.",
      },
      { status: 500 }
    )
  }
}