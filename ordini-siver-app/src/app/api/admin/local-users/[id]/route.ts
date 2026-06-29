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

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { id } = await context.params
    const body = await req.json()

    const aggiornamenti: {
      nome?: string
      cognome?: string
      utente?: string
      email_interna?: string
      locale_id?: string | null
      locale_nome?: string | null
      active?: boolean
      force_password_change?: boolean
      updated_at?: string
    } = {
      updated_at: new Date().toISOString(),
    }

    let authUpdate: {
      email?: string
      password?: string
      user_metadata?: Record<string, unknown>
      app_metadata?: Record<string, unknown>
      ban_duration?: string
    } = {}

    const { data: utenteAttuale, error: utenteAttualeError } =
      await supabaseAdmin
        .from("local_users")
        .select("*")
        .eq("id", id)
        .single()

    if (utenteAttualeError || !utenteAttuale) {
      return NextResponse.json(
        { error: "Utente non trovato." },
        { status: 404 }
      )
    }

    let nome = String(utenteAttuale.nome || "")
    let cognome = String(utenteAttuale.cognome || "")
    let username = String(utenteAttuale.utente || "")
    let emailInterna = String(utenteAttuale.email_interna || "")
    let localeId: string | null = utenteAttuale.locale_id || null
    let localeNome: string | null = utenteAttuale.locale_nome || null
    let active = Boolean(utenteAttuale.active)
    let forcePasswordChange = Boolean(utenteAttuale.force_password_change)

    if ("nome" in body) {
      nome = String(body.nome || "").trim()

      if (!nome) {
        return NextResponse.json(
          { error: "Il nome è obbligatorio." },
          { status: 400 }
        )
      }

      aggiornamenti.nome = nome
    }

    if ("cognome" in body) {
      cognome = String(body.cognome || "").trim()

      if (!cognome) {
        return NextResponse.json(
          { error: "Il cognome è obbligatorio." },
          { status: 400 }
        )
      }

      aggiornamenti.cognome = cognome
    }

    if ("utente" in body) {
      username = normalizzaUsername(String(body.utente || ""))

      if (!username) {
        return NextResponse.json(
          { error: "Lo username è obbligatorio." },
          { status: 400 }
        )
      }

      emailInterna = creaEmailInterna(username)

      const { data: duplicato, error: duplicatoError } = await supabaseAdmin
        .from("local_users")
        .select("id")
        .or(`utente.eq.${username},email_interna.eq.${emailInterna}`)
        .neq("id", id)
        .maybeSingle()

      if (duplicatoError) {
        return NextResponse.json(
          { error: duplicatoError.message },
          { status: 500 }
        )
      }

      if (duplicato) {
        return NextResponse.json(
          { error: "Questo username esiste già." },
          { status: 400 }
        )
      }

      aggiornamenti.utente = username
      aggiornamenti.email_interna = emailInterna
      authUpdate.email = emailInterna
    }

    if ("locale_id" in body) {
      const nuovoLocaleId = body.locale_id
        ? String(body.locale_id).trim()
        : null

      if (nuovoLocaleId) {
        const { data: locale, error: localeError } = await supabaseAdmin
          .from("restaurants")
          .select("id, name")
          .eq("id", nuovoLocaleId)
          .single()

        if (localeError || !locale) {
          return NextResponse.json(
            { error: "Locale non trovato." },
            { status: 404 }
          )
        }

        localeId = locale.id
        localeNome = locale.name
        aggiornamenti.locale_id = locale.id
        aggiornamenti.locale_nome = locale.name
      } else {
        localeId = null
        localeNome = null
        aggiornamenti.locale_id = null
        aggiornamenti.locale_nome = null
      }
    }

    if ("active" in body) {
      active = Boolean(body.active)
      aggiornamenti.active = active
      authUpdate.ban_duration = active ? "none" : "876000h"
    }

    if ("force_password_change" in body) {
      forcePasswordChange = Boolean(body.force_password_change)
      aggiornamenti.force_password_change = forcePasswordChange
    }

    if ("password" in body) {
      const password = String(body.password || "").trim()

      if (!password) {
        return NextResponse.json(
          { error: "Inserisci una password valida." },
          { status: 400 }
        )
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: "La password deve avere almeno 6 caratteri." },
          { status: 400 }
        )
      }

      authUpdate.password = password
      aggiornamenti.force_password_change = false
      forcePasswordChange = false
    }

    authUpdate.user_metadata = {
      nome,
      cognome,
      utente: username,
      locale_id: localeId,
      locale_nome: localeNome,
      force_password_change: forcePasswordChange,
    }

    authUpdate.app_metadata = {
      role: "locale",
      locale_id: localeId,
      locale_nome: localeNome,
    }

    const { error: updateLocalUserError } = await supabaseAdmin
      .from("local_users")
      .update(aggiornamenti)
      .eq("id", id)

    if (updateLocalUserError) {
      return NextResponse.json(
        { error: updateLocalUserError.message },
        { status: 500 }
      )
    }

    const { error: authUpdateError } =
      await supabaseAdmin.auth.admin.updateUserById(id, authUpdate)

    if (authUpdateError) {
      return NextResponse.json(
        { error: authUpdateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore aggiornamento utente.",
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

    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(id)

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      )
    }

    const { error: dbError } = await supabaseAdmin
      .from("local_users")
      .delete()
      .eq("id", id)

    if (dbError) {
      return NextResponse.json(
        { error: dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore eliminazione utente.",
      },
      { status: 500 }
    )
  }
}