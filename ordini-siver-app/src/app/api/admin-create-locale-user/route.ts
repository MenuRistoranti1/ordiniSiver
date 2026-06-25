import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

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
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")
    const ruoloGenerale = String(body.ruolo_generale || "responsabile")
    const restaurantId = body.restaurant_id ? String(body.restaurant_id) : null
    const ruoloLocale = String(body.ruolo_nel_locale || "responsabile")

    if (!nome || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e password sono obbligatori" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La password deve contenere almeno 8 caratteri" },
        { status: 400 }
      )
    }

    const { data: createdUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome,
          cognome,
          ruolo: ruoloGenerale,
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

    const { error: profileError } = await supabaseAdmin
      .from("locale_users")
      .insert({
        id: userId,
        nome,
        cognome: cognome || null,
        email,
        ruolo_generale: ruoloGenerale,
        active: true,
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    if (restaurantId) {
      const { error: assignmentError } = await supabaseAdmin
        .from("locale_user_assignments")
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          ruolo_nel_locale: ruoloLocale,
          active: true,
          valid_from: new Date().toISOString().split("T")[0],
        })

      if (assignmentError) {
        return NextResponse.json(
          {
            error:
              "Utente creato, ma errore assegnazione locale: " +
              assignmentError.message,
          },
          { status: 400 }
        )
      }
    }

    await supabaseAdmin.from("activity_log").insert({
      user_id: userId,
      user_name: `${nome} ${cognome}`.trim(),
      restaurant_id: restaurantId,
      action: "locale_user_created",
      entity: "locale_users",
      entity_id: userId,
      details: {
        email,
        ruolo_generale: ruoloGenerale,
        restaurant_id: restaurantId,
        ruolo_nel_locale: ruoloLocale,
      },
    })

    return NextResponse.json({
      success: true,
      user_id: userId,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Errore creazione utente locale" },
      { status: 500 }
    )
  }
}
