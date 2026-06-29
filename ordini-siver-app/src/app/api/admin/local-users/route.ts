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

function normalizzaUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "")
}

function creaEmailInterna(utente: string) {
  return `${normalizzaUsername(utente)}@local.siver.internal`
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data: locali, error: localiError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name")
      .order("name", { ascending: true })

    if (localiError) {
      return NextResponse.json(
        { error: `Errore locali: ${localiError.message}` },
        { status: 500 }
      )
    }

    const { data: utenti, error: utentiError } = await supabaseAdmin
      .from("local_users")
      .select(
        `
        id,
        nome,
        cognome,
        utente,
        email_interna,
        locale_id,
        locale_nome,
        active,
        created_at,
        updated_at,
        last_login,
        force_password_change
      `
      )
      .order("created_at", { ascending: false })

    if (utentiError) {
      return NextResponse.json(
        { error: `Errore utenti: ${utentiError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      locali: locali || [],
      utenti: utenti || [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Errore caricamento dati",
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await req.json()

    const nome = String(body.nome || "").trim()
    const cognome = String(body.cognome || "").trim()
    const utente = normalizzaUsername(String(body.utente || ""))
    const password = String(body.password || "").trim()
    const localeId = String(body.locale_id || "").trim()

    if (!nome || !cognome || !utente || !password || !localeId) {
      return NextResponse.json(
        { error: "Compila tutti i campi obbligatori." },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La password deve avere almeno 6 caratteri." },
        { status: 400 }
      )
    }

    const emailInterna = creaEmailInterna(utente)

    const { data: locale, error: localeError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name")
      .eq("id", localeId)
      .single()

    if (localeError || !locale) {
      return NextResponse.json(
        { error: "Locale non trovato." },
        { status: 404 }
      )
    }

    const { data: esistente, error: esistenteError } = await supabaseAdmin
      .from("local_users")
      .select("id")
      .or(`utente.eq.${utente},email_interna.eq.${emailInterna}`)
      .maybeSingle()

    if (esistenteError) {
      return NextResponse.json(
        { error: esistenteError.message },
        { status: 500 }
      )
    }

    if (esistente) {
      return NextResponse.json(
        { error: "Questo username esiste già." },
        { status: 400 }
      )
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: emailInterna,
        password,
        email_confirm: true,
        user_metadata: {
          nome,
          cognome,
          utente,
          locale_id: locale.id,
          locale_nome: locale.name,
          force_password_change: false,
        },
        app_metadata: {
          role: "locale",
          locale_id: locale.id,
          locale_nome: locale.name,
        },
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Errore creazione utente Auth." },
        { status: 500 }
      )
    }

    const { error: insertError } = await supabaseAdmin
      .from("local_users")
      .insert({
        id: authData.user.id,
        nome,
        cognome,
        utente,
        email_interna: emailInterna,
        locale_id: locale.id,
        locale_nome: locale.name,
        active: true,
        force_password_change: false,
        updated_at: new Date().toISOString(),
      })

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Errore creazione utente.",
      },
      { status: 500 }
    )
  }
}