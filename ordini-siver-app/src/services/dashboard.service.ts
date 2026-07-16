import { supabase } from "@/lib/supabase"
import { caricaMessaggiNonLetti } from "./dashboard/messaggi.service"
import type {
  DashboardStats,
  GiacenzeInfo,
  LocaleScelta,
  TopItem,
} from "@/types/dashboard"

export async function caricaLocaliUtente(
  user: any,
): Promise<LocaleScelta[]> {
  const { data, error } = await supabase
    .from("local_user_restaurants")
    .select("restaurant_id, restaurant_name, role")
    .eq("user_id", user.id)
    .order("restaurant_name", { ascending: true })

  if (!error && data && data.length > 0) {
    return data as LocaleScelta[]
  }

  const id = user.app_metadata?.locale_id
  const nome = user.app_metadata?.locale_nome

  if (id && nome) {
    return [
      {
        restaurant_id: String(id),
        restaurant_name: String(nome),
        role: "responsabile",
      },
    ]
  }

  return []
}

export async function caricaNomeLocale(id: string) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data?.name || "Locale"
}

export async function caricaDashboardStats(
  id: string,
): Promise<DashboardStats> {
  const [
    giacenzeInfo,
    messaggiNonLetti,
    documentiNonLetti,
    statistiche,
  ] = await Promise.all([
    caricaGiacenzeInfo(id),
    caricaMessaggiNonLetti(id),
    caricaDocumentiNonLetti(id),
    caricaStatisticheLocale(id),
  ])

  return {
    giacenzeInfo,
    messaggiNonLetti,
    documentiNonLetti,
    topOrdinati: statistiche.topOrdinati,
    topRotti: statistiche.topRotti,
    totaleOrdini: statistiche.totaleOrdini,
    totaleRotture: statistiche.totaleRotture,
  }
}

async function caricaGiacenzeInfo(
  id: string,
): Promise<GiacenzeInfo> {
  const settimanaKey = getSettimanaKey()

  const [{ data: prodottiAttivi }, { data: giacenzeSettimana }] =
    await Promise.all([
      supabase
        .from("restaurant_product_settings")
        .select("id, active, prodotto_id, product_id")
        .eq("restaurant_id", id)
        .eq("active", true),
      supabase
        .from("giacenze_settimana")
        .select("id, quantita, nome_prodotto")
        .eq("locale_id", id)
        .eq("settimana_key", settimanaKey),
    ])

  const prodottiUnici = new Set(
    (prodottiAttivi || [])
      .map((item: any) =>
        String(item.prodotto_id || item.product_id || "").trim(),
      )
      .filter(Boolean),
  )

  const prodottiCompilatiUnici = new Set(
    (giacenzeSettimana || [])
      .filter((item: any) => Number(item.quantita || 0) > 0)
      .map((item: any) =>
        String(item.nome_prodotto || "").trim().toUpperCase(),
      )
      .filter(Boolean),
  )

  const totale = prodottiUnici.size
  const compilati = prodottiCompilatiUnici.size
  const percentuale =
    totale > 0 ? Math.min(100, Math.round((compilati / totale) * 100)) : 0

  return {
    compilati,
    totale,
    percentuale,
    completa: totale > 0 && percentuale >= 90,
  }
}



async function caricaDocumentiNonLetti(id: string) {
  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", id)
    .eq("read_by_locale", false)

  if (error) {
    throw new Error(error.message)
  }

  return count || 0
}

async function caricaStatisticheLocale(id: string) {
  const oggi = new Date()
  const primoMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
    .toISOString()
    .split("T")[0]

  const oggiIso = oggi.toISOString().split("T")[0]

  const { data: ordiniData, error: ordiniError } = await supabase
    .from("ordini")
    .select("*")
    .eq("locale_id", id)
    .gte("settimana_key", primoMese)
    .lte("settimana_key", oggiIso)

  if (ordiniError) {
    throw new Error(ordiniError.message)
  }

  const ordinati: Record<string, TopItem> = {}

  for (const ordine of ordiniData || []) {
    const nome = ordine.nome_prodotto || "Prodotto"

    if (!ordinati[nome]) {
      ordinati[nome] = {
        nome,
        quantita: 0,
      }
    }

    ordinati[nome].quantita += Number(ordine.quantita || 0)
  }

  const topOrdinati = Object.values(ordinati)
    .sort((a, b) => b.quantita - a.quantita)
    .slice(0, 5)

  const { data: giacenzeData, error: giacenzeError } = await supabase
    .from("giacenze_settimana")
    .select("*")
    .eq("locale_id", id)
    .order("created_at", { ascending: true })

  if (giacenzeError) {
    throw new Error(giacenzeError.message)
  }

  if (!giacenzeData || giacenzeData.length < 2) {
    return {
      topOrdinati,
      topRotti: [] as TopItem[],
      totaleOrdini: (ordiniData || []).length,
      totaleRotture: 0,
    }
  }

  const primaData = giacenzeData[0].created_at?.split("T")[0]
  const ultimaData =
    giacenzeData[giacenzeData.length - 1].created_at?.split("T")[0]

  const primaGiacenza = giacenzeData.filter(
    (item: any) => item.created_at?.split("T")[0] === primaData,
  )

  const ultimaGiacenza = giacenzeData.filter(
    (item: any) => item.created_at?.split("T")[0] === ultimaData,
  )

  const rotti: Record<string, TopItem> = {}

  for (const ultima of ultimaGiacenza) {
    const prima = primaGiacenza.find(
      (item: any) => item.nome_prodotto === ultima.nome_prodotto,
    )

    if (!prima) continue

    const consegnatoTotale = (ordiniData || [])
      .filter(
        (ordine: any) =>
          ordine.nome_prodotto === ultima.nome_prodotto,
      )
      .reduce(
        (somma: number, ordine: any) =>
          somma + Number(ordine.quantita_consegnata || 0),
        0,
      )

    const totaleRotto =
      Number(prima.quantita || 0) +
      consegnatoTotale -
      Number(ultima.quantita || 0)

    if (totaleRotto > 0) {
      rotti[ultima.nome_prodotto] = {
        nome: ultima.nome_prodotto,
        quantita: totaleRotto,
      }
    }
  }

  const topRotti = Object.values(rotti)
    .sort((a, b) => b.quantita - a.quantita)
    .slice(0, 5)

  return {
    topOrdinati,
    topRotti,
    totaleOrdini: (ordiniData || []).length,
    totaleRotture: topRotti.reduce(
      (somma, item) => somma + item.quantita,
      0,
    ),
  }
}

function sabatoCorrente() {
  const oggi = new Date()
  const giorno = oggi.getDay()
  const diff = giorno >= 6 ? giorno - 6 : giorno + 1
  const sabato = new Date(oggi)

  sabato.setDate(oggi.getDate() - diff)
  sabato.setHours(0, 0, 0, 0)

  return sabato
}

function getSettimanaKey() {
  return sabatoCorrente().toISOString().split("T")[0]
}