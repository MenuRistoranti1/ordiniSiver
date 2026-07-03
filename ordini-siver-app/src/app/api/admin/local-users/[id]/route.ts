import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error("Manca NEXT_PUBLIC_SUPABASE_URL")
  if (!serviceRoleKey) throw new Error("Manca SUPABASE_SERVICE_ROLE_KEY")

  return createClient(supabaseUrl, serviceRoleKey)
}

function normalizzaUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "")
}

function creaEmailInterna(utente: string) {
  return `${normalizzaUsername(utente)}@local.siver.internal`
}


async function verificaAdmin(req: Request, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return false
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  return !error && data.user?.app_metadata?.role === "admin"
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    if (!(await verificaAdmin(req, supabaseAdmin))) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await req.json()

    const { data: utenteAttuale, error: utenteAttualeError } =
      await supabaseAdmin.from("local_users").select("*").eq("id", id).single()

    if (utenteAttualeError || !utenteAttuale) {
      return NextResponse.json({ error: "Utente non trovato." }, { status: 404 })
    }

    let nome = String(utenteAttuale.nome || "")
    let cognome = String(utenteAttuale.cognome || "")
    let username = String(utenteAttuale.utente || "")
    let emailInterna = String(utenteAttuale.email_interna || "")
    let active = Boolean(utenteAttuale.active)
    let forcePasswordChange = Boolean(utenteAttuale.force_password_change)

    const localiAssegnati = Array.isArray(body.locali_assegnati)
      ? body.locali_assegnati.map((v: any) => String(v)).filter(Boolean)
      : []

    if ("nome" in body) nome = String(body.nome || "").trim()
    if ("cognome" in body) cognome = String(body.cognome || "").trim()

    if (!nome || !cognome) {
      return NextResponse.json(
        { error: "Nome e cognome sono obbligatori." },
        { status: 400 }
      )
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
        return NextResponse.json({ error: duplicatoError.message }, { status: 500 })
      }

      if (duplicato) {
        return NextResponse.json(
          { error: "Questo username esiste già." },
          { status: 400 }
        )
      }
    }

    if ("active" in body) active = Boolean(body.active)

    if ("force_password_change" in body) {
      forcePasswordChange = Boolean(body.force_password_change)
    }

    const localePrincipaleId =
      String(body.locale_id || "") || localiAssegnati[0] || null

    let localePrincipale: { id: string; name: string } | null = null

    if (localePrincipaleId) {
      const { data: locale, error: localeError } = await supabaseAdmin
        .from("restaurants")
        .select("id, name")
        .eq("id", localePrincipaleId)
        .single()

      if (localeError || !locale) {
        return NextResponse.json(
          { error: "Locale principale non trovato." },
          { status: 404 }
        )
      }

      localePrincipale = locale
    }

    let passwordUpdate: string | undefined

    if ("password" in body) {
      const password = String(body.password || "").trim()

      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: "La password deve avere almeno 6 caratteri." },
          { status: 400 }
        )
      }

      passwordUpdate = password
      forcePasswordChange = false
    }

    const aggiornamenti = {
      nome,
      cognome,
      utente: username,
      email_interna: emailInterna,
      locale_id: localePrincipale?.id || null,
      locale_nome: localePrincipale?.name || null,
      active,
      force_password_change: forcePasswordChange,
      updated_at: new Date().toISOString(),
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

    if (localiAssegnati.length > 0) {
      const { data: localiDb, error: localiError } = await supabaseAdmin
        .from("restaurants")
        .select("id, name")
        .in("id", localiAssegnati)

      if (localiError) {
        return NextResponse.json({ error: localiError.message }, { status: 500 })
      }

      await supabaseAdmin
        .from("local_user_restaurants")
        .delete()
        .eq("user_id", id)

      const records = (localiDb || []).map((locale) => ({
        user_id: id,
        restaurant_id: locale.id,
        restaurant_name: locale.name,
        role: "responsabile",
      }))

      if (records.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from("local_user_restaurants")
          .insert(records)

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
      }
    }

    const fullName = `${nome} ${cognome}`.trim()

    const authUpdate: any = {
      email: emailInterna,
      user_metadata: {
        nome,
        cognome,
        full_name: fullName,
        display_name: fullName,
        name: fullName,
        utente: username,
        locale_id: localePrincipale?.id || null,
        locale_nome: localePrincipale?.name || null,
        force_password_change: forcePasswordChange,
      },
      app_metadata: {
        role: "locale",
        locale_id: localePrincipale?.id || null,
        locale_nome: localePrincipale?.name || null,
      },
      ban_duration: active ? "none" : "876000h",
    }

    if (passwordUpdate) {
      authUpdate.password = passwordUpdate
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

    if (!(await verificaAdmin(req, supabaseAdmin))) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await context.params

    await supabaseAdmin
      .from("local_user_restaurants")
      .delete()
      .eq("user_id", id)

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const { error: dbError } = await supabaseAdmin
      .from("local_users")
      .delete()
      .eq("id", id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
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