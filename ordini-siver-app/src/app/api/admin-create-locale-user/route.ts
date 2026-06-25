import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

function normalizzaUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Variabili Supabase mancanti" },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const body = await req.json()

    const nome = String(body.nome || "").trim()
    const cognome = String(body.cognome || "").trim()
    const username = normalizzaUsername(String(body.username || ""))
    const password = String(body.password || "")
    const restaurantId = body.restaurant_id ? String(body.restaurant_id) : null

    if (!nome || !cognome || !username || !password || !restaurantId) {
      return NextResponse.json(
        { error: "Nome, cognome, username, password e locale sono obbligatori" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La password deve contenere almeno 8 caratteri" },
        { status: 400 }
      )
    }

    const technicalEmail = `${username}@ordinisiver.local`

    const { data: existingProfile } = await supabaseAdmin
      .from("locale_users")
      .select("id")
      .eq("username", username)
      .maybeSingle()

    if (existingProfile?.id) {
      return NextResponse.json(
        { error: "Username già esistente" },
        { status: 400 }
      )
    }

    const { data: createdUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: technicalEmail,
        password,
        email_confirm: true,
        user_metadata: {
          nome,
          cognome,
          username,
        },
        app_metadata: {
          role: "locale",
        },
      })

    if (createError || !createdUser.user) {
      return NextResponse.json(
        { error: createError?.message || "Errore creazione utente Auth" },
        { status: 400 }
      )
    }

    const userId = createdUser.user.id

    const { data: locale } = await supabaseAdmin
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurantId)
      .maybeSingle()

    const { error: profileError } = await supabaseAdmin
      .from("locale_users")
      .insert({
        id: userId,
        nome,
        cognome,
        username,
        technical_email: technicalEmail,
        email: null,
        ruolo_generale: "responsabile",
        active: true,
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    const { error: assignmentError } = await supabaseAdmin
      .from("locale_user_assignments")
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        ruolo_nel_locale: "responsabile",
        active: true,
        valid_from: new Date().toISOString().split("T")[0],
      })

    if (assignmentError) {
      return NextResponse.json(
        {
          error:
            "Responsabile creato, ma errore assegnazione locale: " +
            assignmentError.message,
        },
        { status: 400 }
      )
    }

    await supabaseAdmin.from("activity_log").insert({
      user_id: userId,
      user_name: `${nome} ${cognome}`.trim(),
      restaurant_id: restaurantId,
      restaurant_name: locale?.name || "",
      action: "responsabile_creato",
      entity: "locale_users",
      entity_id: userId,
      details: {
        username,
        technical_email: technicalEmail,
        restaurant_id: restaurantId,
        restaurant_name: locale?.name || "",
      },
    })

    return NextResponse.json({
      success: true,
      user_id: userId,
      username,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Errore creazione responsabile" },
      { status: 500 }
    )
  }
}
