import { supabase } from "@/lib/supabase"
import type {
  InventoryDraft,
  InventoryProduct,
  InventoryQuantities,
} from "@/types/inventory"

export async function caricaProdottiGiacenze(
  restaurantId: string,
): Promise<InventoryProduct[]> {
  const { data: impostazioni, error } = await supabase
    .from("restaurant_product_settings")
    .select("id, active, min_stock, max_stock, prodotto_id, product_id")
    .eq("restaurant_id", restaurantId)
    .eq("active", true)

  if (error) throw new Error(error.message)

  const impostazioniUnicheMap = new Map<string, any>()

  for (const item of impostazioni || []) {
    const idProdotto = String(
      item.prodotto_id || item.product_id || "",
    ).trim()

    if (!idProdotto) continue

    const esistente = impostazioniUnicheMap.get(idProdotto)

    if (!esistente) {
      impostazioniUnicheMap.set(idProdotto, item)
      continue
    }

    const scoreEsistente =
      Number(esistente.min_stock || 0) +
      Number(esistente.max_stock || 0)

    const scoreNuovo =
      Number(item.min_stock || 0) +
      Number(item.max_stock || 0)

    if (scoreNuovo >= scoreEsistente) {
      impostazioniUnicheMap.set(idProdotto, item)
    }
  }

  const impostazioniUniche = Array.from(
    impostazioniUnicheMap.values(),
  )

  const idsProdotti = Array.from(
    new Set(
      impostazioniUniche
        .map((item: any) =>
          String(item.prodotto_id || item.product_id || "").trim(),
        )
        .filter(Boolean),
    ),
  )

  if (idsProdotti.length === 0) return []

  const { data: prodottiDb, error: errorProdotti } = await supabase
    .from("products")
    .select("id, name, supplier_code, active")
    .in("id", idsProdotti)
    .eq("active", true)

  if (errorProdotti) throw new Error(errorProdotti.message)

  const prodottiPuliti = (prodottiDb || []).filter((prodotto: any) => {
    const nome = String(prodotto.name || "").toUpperCase()
    const codice = String(prodotto.supplier_code || "").toUpperCase()

    return (
      !nome.includes("DUPLICATO ARCHIVIATO") &&
      !nome.includes("[DUPLICATO ARCHIVIATO]") &&
      !nome.includes("[ARCHIVIATO]") &&
      !nome.includes("ARCHIVIATO") &&
      !nome.includes("DUPLICATO") &&
      !codice.includes("__DUP__")
    )
  })

  const prodottiMap = new Map<string, any>()

  for (const prodotto of prodottiPuliti) {
    prodottiMap.set(String(prodotto.id), prodotto)
  }

  return impostazioniUniche
    .map((item: any) => {
      const idProdotto = String(
        item.prodotto_id || item.product_id || "",
      ).trim()

      const prodotto = prodottiMap.get(idProdotto)

      if (!prodotto) return null

      return {
        id: idProdotto,
        nome_prodotto: prodotto.name || "Prodotto",
        supplier_code: prodotto.supplier_code || "-",
        min_stock: Number(item.min_stock || 0),
        max_stock: Number(item.max_stock || 0),
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) =>
      String(a.nome_prodotto || "").localeCompare(
        String(b.nome_prodotto || ""),
        "it",
        { sensitivity: "base" },
      ),
    ) as InventoryProduct[]
}

export async function verificaBloccoGiacenze(
  localeId: string,
  settimanaKey: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("giacenze_settimana")
    .select("id")
    .eq("locale_id", localeId)
    .eq("settimana_key", settimanaKey)
    .limit(1)

  if (error) throw new Error(error.message)

  return Boolean(data && data.length > 0)
}

export async function inviaGiacenzeDefinitive(input: {
  localeId: string
  localeNome: string
  operatore: string
  settimanaKey: string
  prodotti: InventoryProduct[]
  quantita: InventoryQuantities
}): Promise<void> {
  const righe = input.prodotti.map((prodotto) => ({
    locale_id: input.localeId,
    locale_nome: input.localeNome,
    responsabile: input.operatore.trim() || "Operatore",
    nome_prodotto: prodotto.nome_prodotto,
    quantita: Number(input.quantita[prodotto.id] || 0),
    settimana_key: input.settimanaKey,
  }))

  const { error } = await supabase
    .from("giacenze_settimana")
    .insert(righe)

  if (error) throw new Error(error.message)
}

export function caricaBozzaGiacenze(
  localeId: string,
  settimanaKey: string,
): InventoryDraft | null {
  try {
    const salvata = window.localStorage.getItem(
      chiaveBozzaGiacenze(localeId, settimanaKey),
    )

    if (!salvata) return null

    return JSON.parse(salvata) as InventoryDraft
  } catch {
    return null
  }
}

export function salvaBozzaGiacenze(input: InventoryDraft): void {
  window.localStorage.setItem(
    chiaveBozzaGiacenze(input.locale_id, input.settimana_key),
    JSON.stringify(input),
  )
}

export function rimuoviBozzaGiacenze(
  localeId: string,
  settimanaKey: string,
): void {
  window.localStorage.removeItem(
    chiaveBozzaGiacenze(localeId, settimanaKey),
  )
}

function chiaveBozzaGiacenze(
  localeId: string,
  settimanaKey: string,
) {
  return `giacenze_bozza_${localeId}_${settimanaKey}`
}