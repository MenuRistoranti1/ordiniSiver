import { supabase } from "@/lib/supabase"
import { settimanaKeyCorrente } from "@/lib/settimana"
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
  const settimanaKey = settimanaKeyCorrente()

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

  /*
    Un prodotto è compilato se ha una giacenza questa settimana, anche a zero:
    zero è un conteggio valido. Si contano solo i prodotti della lista del
    locale, così righe di prodotti tolti dalla lista non gonfiano il totale.
  */
  const idsProdotti = Array.from(prodottiUnici)

  const { data: nomiProdotti } = idsProdotti.length
    ? await supabase.from("products").select("id, name").in("id", idsProdotti)
    : { data: [] as { id: string; name: string }[] }

  const nomiInviati = new Set(
    (giacenzeSettimana || []).map((item: any) =>
      String(item.nome_prodotto || "").trim().toUpperCase(),
    ),
  )

  const prodottiCompilatiUnici = new Set(
    (nomiProdotti || [])
      .filter((prodotto: any) =>
        nomiInviati.has(String(prodotto.name || "").trim().toUpperCase()),
      )
      .map((prodotto: any) => String(prodotto.id)),
  )

  const totale = prodottiUnici.size
  const compilati = prodottiCompilatiUnici.size
  const percentuale =
    totale > 0 ? Math.min(100, Math.round((compilati / totale) * 100)) : 0

  return {
    compilati,
    totale,
    percentuale,
    // Completa solo se ogni prodotto è stato contato: un prodotto saltato
    // verrebbe letto come esaurito e l'ordine lo proporrebbe fino al massimo.
    completa: totale > 0 && compilati >= totale,
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

/** Ampiezza del periodo su cui si misurano le dispersioni. */
const SETTIMANE_DISPERSIONE = 4

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

  /*
    Dispersione = conteggio iniziale + consegnato nel periodo - conteggio finale.

    Il periodo si misura sulle settimane, non sulla data di inserimento delle
    righe: uno storico caricato in un solo giorno faceva risultare "prima
    giacenza" il conteggio di mesi prima, mentre le consegne erano contate solo
    dal primo del mese, e tutto ciò che era arrivato nel mezzo sembrava rotto.

    Il conteggio di una settimana precede la consegna del suo ordine: fra il
    conteggio iniziale e quello finale arrivano gli ordini dalla settimana
    iniziale fino a quella prima della finale.
  */
  const { data: giacenzeData, error: giacenzeError } = await supabase
    .from("giacenze_settimana")
    .select("nome_prodotto, quantita, settimana_key")
    .eq("locale_id", id)

  if (giacenzeError) {
    throw new Error(giacenzeError.message)
  }

  const settimane = Array.from(
    new Set((giacenzeData || []).map((riga: any) => String(riga.settimana_key || ""))),
  )
    .filter(Boolean)
    .sort()

  const settimanaFinale = settimane[settimane.length - 1]
  const limite = settimanaFinale ? new Date(settimanaFinale) : null
  limite?.setUTCDate(limite.getUTCDate() - SETTIMANE_DISPERSIONE * 7)

  const settimanaIniziale = limite
    ? settimane.find(
        (settimana) =>
          settimana >= limite.toISOString().slice(0, 10) &&
          settimana < settimanaFinale,
      )
    : undefined

  if (!settimanaFinale || !settimanaIniziale) {
    return {
      topOrdinati,
      topRotti: [] as TopItem[],
      totaleOrdini: (ordiniData || []).length,
      totaleRotture: 0,
    }
  }

  const { data: consegneData, error: consegneError } = await supabase
    .from("ordini")
    .select("nome_prodotto, quantita_consegnata, settimana_key")
    .eq("locale_id", id)
    .gte("settimana_key", settimanaIniziale)
    .lt("settimana_key", settimanaFinale)

  if (consegneError) {
    throw new Error(consegneError.message)
  }

  const chiave = (nome: unknown) => String(nome || "").trim().toUpperCase()

  const consegnato = new Map<string, number>()

  for (const ordine of consegneData || []) {
    const nome = chiave(ordine.nome_prodotto)
    consegnato.set(
      nome,
      (consegnato.get(nome) || 0) + Number(ordine.quantita_consegnata || 0),
    )
  }

  const iniziali = new Map<string, number>()

  for (const riga of giacenzeData || []) {
    if (riga.settimana_key !== settimanaIniziale) continue
    iniziali.set(chiave(riga.nome_prodotto), Number(riga.quantita || 0))
  }

  const rotti: Record<string, TopItem> = {}

  for (const finale of giacenzeData || []) {
    if (finale.settimana_key !== settimanaFinale) continue

    const nome = chiave(finale.nome_prodotto)
    const iniziale = iniziali.get(nome)

    if (iniziale === undefined) continue

    const totaleRotto =
      iniziale + (consegnato.get(nome) || 0) - Number(finale.quantita || 0)

    if (totaleRotto > 0) {
      rotti[finale.nome_prodotto] = {
        nome: finale.nome_prodotto,
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
