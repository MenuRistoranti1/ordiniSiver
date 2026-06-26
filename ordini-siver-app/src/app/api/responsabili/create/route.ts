import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()

  const { email, password, nome, cognome, locale_id } = body

  // 1. crea utente auth
  const { data: user, error: userError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  // 2. crea profilo
  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    auth_id: user.user.id,
    email,
    nome,
    cognome,
    locale_id,
    role: "responsabile",
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}