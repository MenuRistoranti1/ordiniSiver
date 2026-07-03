import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error("Manca NEXT_PUBLIC_SUPABASE_URL")
  if (!serviceRoleKey) throw new Error("Manca SUPABASE_SERVICE_ROLE_KEY")

  return createClient(supabaseUrl, serviceRoleKey)
}


async function verificaAdmin(req: Request, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return false
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  return !error && data.user?.app_metadata?.role === "admin"
}

export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    if (!(await verificaAdmin(req, supabaseAdmin))) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories: data || [] })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore caricamento categorie.",
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    if (!(await verificaAdmin(req, supabaseAdmin))) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await req.json()

    const name = String(body.name || "").trim()
    const active = "active" in body ? Boolean(body.active) : true

    if (!name) {
      return NextResponse.json(
        { error: "Il nome categoria è obbligatorio." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin.from("categories").insert({
      name,
      active,
      updated_at: new Date().toISOString(),
    })

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
            : "Errore creazione categoria.",
      },
      { status: 500 }
    )
  }
}