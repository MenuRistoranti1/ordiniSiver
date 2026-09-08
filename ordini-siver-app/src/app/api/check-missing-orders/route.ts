import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import { oraItaliana, settimanaKeyCorrente } from "@/lib/settimana"

/*
  Promemoria settimanale: ogni domenica alle 22:00 italiane avvisa i locali
  che non hanno ancora inviato giacenze e/o ordine della settimana.

  L'Italia cambia fuso due volte l'anno mentre i cron di Vercel girano in UTC,
  quindi in vercel.json sono pianificate due esecuzioni (20:00 e 21:00 UTC):
  a seconda del periodo dell'anno una sola delle due cade davvero alle 22:00
  italiane, l'altra esce subito dal controllo qui sotto senza inviare nulla.
*/
const ORA_PROMEMORIA = 22

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})


async function verificaAdmin(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return false
  const { data, error } = await supabase.auth.getUser(token)
  return !error && data.user?.app_metadata?.role === "admin"
}

/*
  Vercel chiama i cron con "Authorization: Bearer <CRON_SECRET>" quando la
  variabile è impostata sul progetto. Senza questo riconoscimento la chiamata
  automatica finirebbe sul controllo admin e riceverebbe 401, che è il motivo
  per cui finora i promemoria partivano solo a mano dalla pagina Alert.
*/
function chiamataDalCron(req: Request) {
  const segreto = process.env.CRON_SECRET

  if (!segreto) return false

  return req.headers.get("authorization") === `Bearer ${segreto}`
}

export async function GET(req: Request) {
  try {
    const daCron = chiamataDalCron(req)

    if (!daCron && !(await verificaAdmin(req))) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    // L'invio manuale dalla pagina Alert resta possibile a qualsiasi ora.
    if (daCron && oraItaliana() !== ORA_PROMEMORIA) {
      return NextResponse.json({
        success: true,
        saltato: true,
        motivo: `Esecuzione fuori orario: in Italia sono le ${oraItaliana()}, i promemoria partono alle ${ORA_PROMEMORIA}.`,
      })
    }

    const settimanaKey = settimanaKeyCorrente()

    const { data: locali, error: localiError } = await supabase
      .from("restaurants")
      .select("*")

    if (localiError) {
      return NextResponse.json({
        error: localiError.message,
      })
    }

    const risultatiEmail: any[] = []

    for (const locale of locali || []) {
      const { data: giacenze } = await supabase
        .from("giacenze_settimana")
        .select("id")
        .eq("locale_id", locale.id)
        .eq("settimana_key", settimanaKey)
        .limit(1)

      const { data: ordini } = await supabase
        .from("ordini")
        .select("id")
        .eq("locale_id", locale.id)
        .eq("settimana_key", settimanaKey)
        .limit(1)

      const mancaGiacenza = !giacenze || giacenze.length === 0
      const mancaOrdine = !ordini || ordini.length === 0

      if (!(mancaGiacenza || mancaOrdine)) {
        continue
      }

      const tipoAlert =
        mancaGiacenza && mancaOrdine
          ? "giacenza_ordine"
          : mancaGiacenza
          ? "giacenza"
          : "ordine"

      const { data: alertEsistente } = await supabase
        .from("alert_log")
        .select("id")
        .eq("locale_id", locale.id)
        .eq("settimana_key", settimanaKey)
        .eq("tipo_alert", tipoAlert)
        .limit(1)

      if (alertEsistente && alertEsistente.length > 0) {
        risultatiEmail.push({
          locale: locale.name,
          email: locale.email,
          saltato: true,
          motivo: "Alert già inviato",
        })

        continue
      }

      if (!locale.email) {
        continue
      }

      try {
        await transporter.sendMail({
          from: `"OrdiniSiver" <${process.env.EMAIL_USER}>`,
          to: locale.email,
          subject: `Promemoria compilazione - ${locale.name}`,
          html: `
            <div style="font-family:Arial;padding:40px;background:#f4f7fb">
              <div style="max-width:700px;margin:auto;background:white;border-radius:20px;padding:40px">

                <h1 style="color:#07132b;font-size:34px;margin-bottom:10px">
                  OrdiniSiver
                </h1>

                <p style="font-size:20px;color:#666">
                  Promemoria compilazione settimanale
                </p>

                <div style="margin-top:30px;padding:25px;background:#fff5f5;border:3px solid #dc2626;border-radius:20px">
                  <h2 style="color:#dc2626;font-size:28px;margin-bottom:20px">
                    ⚠ Azione richiesta
                  </h2>

                  <p style="font-size:20px;color:#111">
                    Il locale <strong>${locale.name}</strong> non ha ancora completato:
                  </p>

                  <div style="margin-top:20px;font-size:20px;color:#222;line-height:2">
                    ${mancaGiacenza ? "• Giacenze settimanali<br>" : ""}
                    ${mancaOrdine ? "• Ordine settimanale<br>" : ""}
                  </div>
                </div>

                <p style="margin-top:40px;color:#777;font-size:16px">
                  Questo è un messaggio automatico inviato da OrdiniSiver.
                </p>

              </div>
            </div>
          `,
        })

        await supabase.from("alert_log").insert({
          locale_id: locale.id,
          locale_nome: locale.name,
          email: locale.email,
          tipo_alert: tipoAlert,
          settimana_key: settimanaKey,
          inviato: true,
        })

        risultatiEmail.push({
          locale: locale.name,
          email: locale.email,
          inviato: true,
        })
      } catch (errore: any) {
        await supabase.from("alert_log").insert({
          locale_id: locale.id,
          locale_nome: locale.name,
          email: locale.email,
          tipo_alert: tipoAlert,
          settimana_key: settimanaKey,
          inviato: false,
          errore: errore.message,
        })

        risultatiEmail.push({
          locale: locale.name,
          email: locale.email,
          inviato: false,
          errore: errore.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      settimanaKey,
      risultatiEmail,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    })
  }
}