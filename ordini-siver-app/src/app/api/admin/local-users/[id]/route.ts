import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json()

  const aggiornamenti: {
    locale_id?: number | null
    locale_nome?: string | null
    active?: boolean
  } = {}

  let appMetadataUpdate: Record<string, unknown> = {
    role: "locale",
  }

  if ("locale_id" in body) {
    const localeId = body.locale_id ? Number(body.locale_id) : null

    if (localeId) {
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

      aggiornamenti.locale_id = locale.id
      aggiornamenti.locale_nome = locale.name

      appMetadataUpdate = {
        role: "locale",
        locale_id: locale.id,
        locale_nome: locale.name,
      }
    } else {
      aggiornamenti.locale_id = null
      aggiornamenti.locale_nome = null

      appMetadataUpdate = {
        role: "locale",
        locale_id: null,
        locale_nome: null,
      }
    }
  }

  if ("active" in body) {
    aggiornamenti.active = Boolean(body.active)
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
    await supabaseAdmin.auth.admin.updateUserById(id, {
      app_metadata: appMetadataUpdate,
      ban_duration: aggiornamenti.active === false ? "876000h" : "none",
    })

  if (authUpdateError) {
    return NextResponse.json(
      { error: authUpdateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
  })
}