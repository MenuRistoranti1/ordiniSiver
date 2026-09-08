"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useToast } from "@/components/Toast"
import { supabase } from "@/lib/supabase"
import {
  caricaBozzaGiacenze,
  caricaProdottiGiacenze,
  inviaGiacenzeDefinitive,
  rimuoviBozzaGiacenze,
  salvaBozzaGiacenze,
  verificaBloccoGiacenze,
} from "@/services/inventory.service"
import type {
  InventoryFilter,
  InventoryProduct,
  InventoryQuantities,
  InventorySort,
  InventoryStatus,
} from "@/types/inventory"

const QUANTITA_MASSIMA = 9999

export function useLocaleInventory() {
  const { showToast } = useToast()

  const [prodotti, setProdotti] = useState<InventoryProduct[]>([])
  const [quantita, setQuantita] = useState<InventoryQuantities>({})
  const [localeId, setLocaleId] = useState("")
  const [localeNome, setLocaleNome] = useState("")
  const [operatore, setOperatore] = useState("Operatore")
  const [blocco, setBlocco] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [ultimaModifica, setUltimaModifica] = useState<string | null>(null)
  const [ultimaBozza, setUltimaBozza] = useState<string | null>(null)

  const [ricerca, setRicerca] = useState("")
  const [filtro, setFiltro] = useState<InventoryFilter>("tutti")
  const [ordinamento, setOrdinamento] = useState<InventorySort>("nome")

  /*
    Elenco dei prodotti ancora da compilare, congelato nel momento in cui
    l'utente (o l'invio) attiva la vista "solo da compilare".
    Se filtrassimo di volta in volta sullo stato attuale, la riga uscirebbe
    dalla lista alla prima cifra digitata: chi deve scrivere 30 vedrebbe
    sparire il prodotto appena premuto il 3.
  */
  const [idsDaCompletare, setIdsDaCompletare] = useState<string[] | null>(null)

  const soloDaCompilare = idsDaCompletare !== null

  const [bozzaPronta, setBozzaPronta] = useState(false)

  useEffect(() => {
    void inizializzaPagina()
  }, [])

  /*
    Salvataggio automatico della bozza: le quantità inserite non devono
    dipendere dal ricordarsi di premere "Salva bozza". Parte solo dopo il
    caricamento iniziale, per non sovrascrivere con un elenco vuoto una
    bozza appena ripristinata.
  */
  useEffect(() => {
    if (!bozzaPronta || !localeId || !localeNome) return

    const haValori = Object.values(quantita).some(
      (valore) => valore !== undefined && valore !== "",
    )

    if (!haValori) return

    const timer = window.setTimeout(() => {
      try {
        const salvataAlle = new Date().toISOString()

        salvaBozzaGiacenze({
          locale_id: localeId,
          locale_nome: localeNome,
          settimana_key: getSettimanaKey(),
          quantita,
          salvataAlle,
        })

        setUltimaBozza(salvataAlle)
      } catch (errore) {
        console.log(errore)
      }
    }, 800)

    return () => window.clearTimeout(timer)
  }, [quantita, bozzaPronta, localeId, localeNome])

  async function inizializzaPagina() {
    setLoading(true)

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        window.location.href = "/"
        return
      }

      if (user.app_metadata?.role !== "locale") {
        await supabase.auth.signOut()
        window.location.href = "/"
        return
      }

      const id =
        localStorage.getItem("locale_id") ||
        String(user.app_metadata?.locale_id || "")

      const nome =
        localStorage.getItem("locale_nome") ||
        String(user.app_metadata?.locale_nome || "")

      if (!id || !nome) {
        await supabase.auth.signOut()
        localStorage.removeItem("locale_id")
        localStorage.removeItem("locale_nome")
        localStorage.removeItem("locale_scelto")
        window.location.href = "/"
        return
      }

      setLocaleId(id)
      setLocaleNome(nome)
      setOperatore(nomeUtenteDaSessione(user))

      await caricaTutto(id)
    } catch (errore) {
      console.log(errore)
      showToast("Errore durante il caricamento delle giacenze", "error")
    } finally {
      setLoading(false)
    }
  }

  async function caricaTutto(id: string) {
    await caricaProdotti(id)
    ripristinaBozza(id)
    await controllaBlocco(id)
    setBozzaPronta(true)
  }

  async function caricaProdotti(id: string) {
    try {
      const elenco = await caricaProdottiGiacenze(id)
      setProdotti(elenco)

      // Rimuove eventuali quantità rimaste in memoria per prodotti non più attivi.
      setQuantita((attuali) => {
        const prossime: InventoryQuantities = {}

        elenco.forEach((prodotto) => {
          if (attuali[prodotto.id] !== undefined) {
            prossime[prodotto.id] = attuali[prodotto.id]
          }
        })

        return prossime
      })
    } catch (errore) {
      console.log(errore)
      showToast("Errore caricamento prodotti", "error")
    }
  }

  function ripristinaBozza(id: string) {
    const bozza = caricaBozzaGiacenze(id, getSettimanaKey())

    if (!bozza) return

    if (bozza.quantita && typeof bozza.quantita === "object") {
      setQuantita(bozza.quantita)
    }

    if (bozza.salvataAlle) {
      setUltimaBozza(bozza.salvataAlle)
    }
  }

  async function controllaBlocco(id: string) {
    try {
      const giaInviate = await verificaBloccoGiacenze(id, getSettimanaKey())

      if (!giaInviate) {
        setBlocco("")
        return
      }

      const prossimo = prossimoSabato().toLocaleDateString("it-IT")

      setBlocco(
        `Hai già inviato le giacenze di questa settimana. Potrai inserirle nuovamente da sabato ${prossimo}.`,
      )
    } catch (errore) {
      console.log(errore)
    }
  }

  async function aggiornaPagina() {
    if (!localeId) return

    setLoading(true)

    try {
      await caricaTutto(localeId)
      showToast("Giacenze aggiornate", "success")
    } finally {
      setLoading(false)
    }
  }

  function statoSoglia(prodotto: InventoryProduct): InventoryStatus {
    const valore = quantita[prodotto.id]

    if (valore === undefined || valore === "") return "Da compilare"

    const qta = Number(valore)
    const min = Number(prodotto.min_stock || 0)
    const max = Number(prodotto.max_stock || 0)

    if (min > 0 && qta < min) return "Sotto soglia"
    if (max > 0 && qta > max) return "Sopra soglia"

    return "Corretto"
  }

  function prodottoCompilato(prodotto: InventoryProduct) {
    const valore = quantita[prodotto.id]
    return valore !== undefined && valore !== ""
  }

  function mostraSoloDaCompilare(attiva: boolean) {
    if (!attiva) {
      setIdsDaCompletare(null)
      return
    }

    setIdsDaCompletare(
      prodotti
        .filter((prodotto) => !prodottoCompilato(prodotto))
        .map((prodotto) => prodotto.id),
    )
  }

  function normalizzaQuantitaInput(valore: string) {
    const soloNumeri = valore.replace(/\D/g, "").slice(0, 4)

    if (soloNumeri === "") return ""

    const numero = Math.min(QUANTITA_MASSIMA, Math.max(0, Number(soloNumeri)))
    return String(numero)
  }

  function aggiornaQuantita(idProdotto: string, valore: string) {
    const valorePulito = normalizzaQuantitaInput(valore)

    setQuantita((attuali) => ({
      ...attuali,
      [idProdotto]: valorePulito,
    }))

    setUltimaModifica(idProdotto)

    window.setTimeout(() => {
      setUltimaModifica((attuale) =>
        attuale === idProdotto ? null : attuale,
      )
    }, 450)
  }

  function cambiaQuantita(idProdotto: string, variazione: number) {
    const attuale = Number(quantita[idProdotto] || 0)
    const nuova = Math.min(
      QUANTITA_MASSIMA,
      Math.max(0, attuale + variazione),
    )

    aggiornaQuantita(idProdotto, String(nuova))
  }

  const prodottiFiltrati = useMemo(() => {
    let lista = [...prodotti]

    if (ricerca.trim()) {
      const testo = ricerca.toLowerCase()

      lista = lista.filter(
        (prodotto) =>
          prodotto.nome_prodotto?.toLowerCase().includes(testo) ||
          prodotto.supplier_code?.toLowerCase().includes(testo),
      )
    }

    if (idsDaCompletare) {
      lista = lista.filter((prodotto) => idsDaCompletare.includes(prodotto.id))
    }

    if (filtro === "compilati") {
      lista = lista.filter((prodotto) => prodottoCompilato(prodotto))
    } else if (filtro !== "tutti") {
      lista = lista.filter((prodotto) => statoSoglia(prodotto) === filtro)
    }

    if (ordinamento === "nome") {
      lista.sort((a, b) => a.nome_prodotto.localeCompare(b.nome_prodotto))
    }

    if (ordinamento === "codice") {
      lista.sort((a, b) =>
        (a.supplier_code || "").localeCompare(b.supplier_code || ""),
      )
    }

    if (ordinamento === "min") {
      lista.sort((a, b) => Number(b.min_stock || 0) - Number(a.min_stock || 0))
    }

    if (ordinamento === "max") {
      lista.sort((a, b) => Number(b.max_stock || 0) - Number(a.max_stock || 0))
    }

    if (ordinamento === "stato") {
      const peso: Record<InventoryStatus, number> = {
        "Sotto soglia": 1,
        "Da compilare": 2,
        Corretto: 3,
        "Sopra soglia": 4,
      }

      lista.sort((a, b) => peso[statoSoglia(a)] - peso[statoSoglia(b)])
    }

    return lista
  }, [prodotti, ricerca, filtro, ordinamento, idsDaCompletare, quantita])

  const prodottiTotali = prodotti.length

  const prodottiCompilati = prodotti.filter((prodotto) =>
    prodottoCompilato(prodotto),
  ).length

  const quantitaTotaleCompilata = prodotti.reduce(
    (totale, prodotto) => totale + Number(quantita[prodotto.id] || 0),
    0,
  )

  const prodottiSottoSoglia = prodotti.filter(
    (prodotto) => statoSoglia(prodotto) === "Sotto soglia",
  ).length

  const percentualeCompilazione = prodottiTotali
    ? Math.round((prodottiCompilati / prodottiTotali) * 100)
    : 0

  async function salvaBozza() {
    if (isDraftSaving || isSaving) return

    if (!(await sessioneValida())) return

    setIsDraftSaving(true)

    try {
      const salvataAlle = new Date().toISOString()

      salvaBozzaGiacenze({
        locale_id: localeId,
        locale_nome: localeNome,
        settimana_key: getSettimanaKey(),
        quantita,
        salvataAlle,
      })

      setUltimaBozza(salvataAlle)
      showToast("Bozza giacenze salvata", "success")
    } catch (errore) {
      console.log(errore)
      showToast("Errore salvataggio bozza", "error")
    } finally {
      setIsDraftSaving(false)
    }
  }

  async function inviaGiacenze() {
    if (isSaving) return

    if (!(await sessioneValida())) return

    if (blocco) {
      showToast(blocco, "warning")
      return
    }

    const prodottiMancanti = prodotti.filter(
      (prodotto) => !prodottoCompilato(prodotto),
    )

    if (prodottiMancanti.length > 0) {
      showToast(
        `Mancano ${prodottiMancanti.length} prodotti da compilare. Te li ho lasciati in elenco: le quantità già inserite restano salvate.`,
        "warning",
      )

      mostraSoloDaCompilare(true)
      setFiltro("tutti")
      return
    }

    const conferma = window.confirm(
      `Stai inviando le giacenze definitive per ${prodottiTotali} prodotti, quantità totale ${quantitaTotaleCompilata}. Dopo l'invio non potrai modificarle fino alla prossima settimana. Confermi?`,
    )

    if (!conferma) return

    setIsSaving(true)

    try {
      await inviaGiacenzeDefinitive({
        localeId,
        localeNome,
        operatore,
        settimanaKey: getSettimanaKey(),
        prodotti,
        quantita,
      })

      rimuoviBozzaGiacenze(localeId, getSettimanaKey())
      showToast("Giacenze inviate!", "success")

      setTimeout(() => {
        window.location.href = "/dashboard"
      }, 800)
    } catch (errore) {
      console.log(errore)
      showToast("Errore invio giacenze", "error")
      setIsSaving(false)
    }
  }

  async function sessioneValida() {
    if (localeId && localeNome) return true

    showToast(
      "Sessione locale non valida. Effettua di nuovo il login.",
      "error",
    )

    await supabase.auth.signOut()
    window.location.href = "/"

    return false
  }

  return {
    localeNome,
    operatore,
    blocco,
    loading,
    isSaving,
    isDraftSaving,
    ultimaModifica,
    ultimaBozza,

    quantita,
    prodottiFiltrati,
    prodottiTotali,
    prodottiCompilati,
    quantitaTotaleCompilata,
    prodottiSottoSoglia,
    percentualeCompilazione,

    ricerca,
    setRicerca,
    filtro,
    setFiltro,
    ordinamento,
    setOrdinamento,
    soloDaCompilare,
    setSoloDaCompilare: mostraSoloDaCompilare,

    statoSoglia,
    prodottoCompilato,
    aggiornaQuantita,
    cambiaQuantita,
    aggiornaPagina,
    salvaBozza,
    inviaGiacenze,

    salutoOrario,
    periodoSettimana,
  }
}

function nomeUtenteDaSessione(user: User) {
  const meta = user.user_metadata || {}
  const app = user.app_metadata || {}

  const nome =
    meta.full_name ||
    meta.name ||
    meta.display_name ||
    meta.nome ||
    app.full_name ||
    app.name ||
    app.nome ||
    app.operator_name ||
    ""

  if (nome && !String(nome).includes("@")) return String(nome).trim()

  const email = String(user.email || "")
  const localPart = email.split("@")[0] || "Operatore"

  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (lettera) => lettera.toUpperCase())
    .trim()
}

function salutoOrario() {
  const ora = new Date().getHours()

  if (ora >= 5 && ora < 13) return "Buongiorno"
  if (ora >= 13 && ora < 18) return "Buon pomeriggio"
  return "Buonasera"
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

function prossimoSabato() {
  const sabato = sabatoCorrente()
  sabato.setDate(sabato.getDate() + 7)
  return sabato
}

function getSettimanaKey() {
  return sabatoCorrente().toISOString().split("T")[0]
}

function periodoSettimana() {
  const inizio = sabatoCorrente()
  const fine = new Date(inizio)
  fine.setDate(inizio.getDate() + 6)

  return `${inizio.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  })} – ${fine.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`
}
