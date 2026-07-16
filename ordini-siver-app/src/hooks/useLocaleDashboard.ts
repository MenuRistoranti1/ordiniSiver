"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/Toast"
import { supabase } from "@/lib/supabase"
import {
  caricaDashboardStats,
  caricaLocaliUtente,
  caricaNomeLocale,
} from "@/services/dashboard.service"
import type {
  GiacenzeInfo,
  LocaleScelta,
  TopItem,
} from "@/types/dashboard"

export function useLocaleDashboard() {
  const { showToast } = useToast()

  const [localeNome, setLocaleNome] = useState("")
  const [localeId, setLocaleId] = useState("")
  const [utenteNome, setUtenteNome] = useState("")
  const [localiDisponibili, setLocaliDisponibili] = useState<LocaleScelta[]>([])
  const [selectorAperto, setSelectorAperto] = useState(false)

  const [giacenzeInfo, setGiacenzeInfo] = useState<GiacenzeInfo>({
    compilati: 0,
    totale: 0,
    percentuale: 0,
    completa: false,
  })

  const [messaggiNonLetti, setMessaggiNonLetti] = useState(0)
  const [documentiNonLetti, setDocumentiNonLetti] = useState(0)
  const [topOrdinati, setTopOrdinati] = useState<TopItem[]>([])
  const [topRotti, setTopRotti] = useState<TopItem[]>([])
  const [totaleOrdini, setTotaleOrdini] = useState(0)
  const [totaleRotture, setTotaleRotture] = useState(0)
  const [loading, setLoading] = useState(false)

  const giacenzeOk = giacenzeInfo.completa

  useEffect(() => {
    void inizializzaDashboard()
  }, [])

  async function inizializzaDashboard() {
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

      setUtenteNome(ricavaNomeUtente(user))

      const locali = await caricaLocaliUtente(user)
      setLocaliDisponibili(locali)

      let id = localStorage.getItem("locale_id") || ""
      let nome = localStorage.getItem("locale_nome") || ""

      const localeSalvatoValido = locali.some(
        (locale) => String(locale.restaurant_id) === String(id),
      )

      if ((!id || !nome || !localeSalvatoValido) && locali.length === 1) {
        id = String(locali[0].restaurant_id)
        nome = String(locali[0].restaurant_name)

        localStorage.setItem("locale_id", id)
        localStorage.setItem("locale_nome", nome)
        localStorage.setItem("locale_scelto", "true")
      }

      if ((!id || !nome || !localeSalvatoValido) && locali.length > 1) {
        window.location.href = "/"
        return
      }

      if (!id || !nome) {
        window.location.href = "/"
        return
      }

      setLocaleId(id)
      setLocaleNome(nome)

      await caricaTutto(id, false)
    } catch (error) {
      console.error("Errore inizializzazione dashboard:", error)
      showToast("Errore durante il caricamento della dashboard", "error")
    } finally {
      setLoading(false)
    }
  }

  function cambiaLocale(locale: LocaleScelta) {
    const nuovoId = String(locale.restaurant_id)
    const nuovoNome = String(locale.restaurant_name)

    localStorage.setItem("locale_id", nuovoId)
    localStorage.setItem("locale_nome", nuovoNome)
    localStorage.setItem("locale_scelto", "true")

    setLocaleId(nuovoId)
    setLocaleNome(nuovoNome)
    setSelectorAperto(false)

    void caricaTutto(nuovoId, true)
  }

  async function caricaTutto(id: string, mostraMessaggio = true) {
    if (!id) return

    setLoading(true)

    try {
      const [nome, stats] = await Promise.all([
        caricaNomeLocale(id),
        caricaDashboardStats(id),
      ])

      setLocaleNome(nome)
      localStorage.setItem("locale_nome", nome)

      setGiacenzeInfo(stats.giacenzeInfo)
      setMessaggiNonLetti(stats.messaggiNonLetti)
      setDocumentiNonLetti(stats.documentiNonLetti)
      setTopOrdinati(stats.topOrdinati)
      setTopRotti(stats.topRotti)
      setTotaleOrdini(stats.totaleOrdini)
      setTotaleRotture(stats.totaleRotture)

      if (mostraMessaggio) {
        showToast("Dashboard aggiornata", "success")
      }
    } catch (error) {
      console.error("Errore caricamento dashboard:", error)
      showToast("Errore durante l'aggiornamento della dashboard", "error")
    } finally {
      setLoading(false)
    }
  }

  function vai(percorso: string) {
    window.location.href = percorso
  }

  function vaiNuovoOrdine() {
    if (giacenzeOk) {
      vai("/nuovo-ordine")
      return
    }

    showToast(
      "Prima devi compilare le giacenze della settimana",
      "warning",
    )
  }

  function salutoOrario() {
    const ora = new Date().getHours()

    if (ora >= 5 && ora < 13) return "Buongiorno"
    if (ora >= 13 && ora < 18) return "Buon pomeriggio"
    return "Buonasera"
  }

  const statoOperativo = useMemo(() => {
    if (giacenzeInfo.totale === 0) {
      return {
        titolo: "Prodotti non configurati",
        testo: "Non risultano prodotti attivi configurati per questo locale.",
        classe: "border-amber-300 bg-amber-50 text-amber-900",
        icona: AlertTriangle,
      }
    }

    if (giacenzeInfo.compilati === 0) {
      return {
        titolo: "Giacenze da completare",
        testo:
          "Il nuovo ordine è bloccato finché non vengono inserite le giacenze settimanali.",
        classe: "border-amber-300 bg-amber-50 text-amber-900",
        icona: AlertTriangle,
      }
    }

    if (!giacenzeInfo.completa) {
      return {
        titolo: "Attenzione: giacenze incomplete",
        testo: `Hai compilato ${giacenzeInfo.compilati} prodotti su ${giacenzeInfo.totale}. Completa le giacenze prima di procedere.`,
        classe: "border-amber-300 bg-amber-50 text-amber-900",
        icona: AlertTriangle,
      }
    }

    if (totaleRotture > 0) {
      return {
        titolo: "Controllare dispersioni",
        testo: "Sono presenti possibili rotture o dispersioni da verificare.",
        classe: "border-red-300 bg-red-50 text-red-900",
        icona: AlertTriangle,
      }
    }

    return {
      titolo: "Operatività regolare",
      testo:
        "Giacenze complete e nessuna dispersione rilevante nei dati calcolati.",
      classe: "border-green-300 bg-green-50 text-green-900",
      icona: CheckCircle2,
    }
  }, [giacenzeInfo, totaleRotture])

  return {
    localeNome,
    localeId,
    utenteNome,
    localiDisponibili,
    selectorAperto,
    setSelectorAperto,

    giacenzeInfo,
    giacenzeOk,

    messaggiNonLetti,
    documentiNonLetti,
    topOrdinati,
    topRotti,
    totaleOrdini,
    totaleRotture,
    loading,

    statoOperativo,

    cambiaLocale,
    caricaTutto,
    vai,
    vaiNuovoOrdine,
    salutoOrario,
  }
}

function ricavaNomeUtente(user: any) {
  const valoreDiretto = String(
    user.app_metadata?.full_name ||
      user.app_metadata?.name ||
      user.app_metadata?.display_name ||
      user.app_metadata?.nome ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      user.user_metadata?.nome ||
      "",
  ).trim()

  if (valoreDiretto && !valoreDiretto.includes("@")) {
    return valoreDiretto
  }

  const email = String(user.email || "").trim()
  const parteLocale = email.split("@")[0] || ""

  if (!parteLocale) return ""

  const pulito = parteLocale
    .replace(/^[a-z]\.?([a-z]{3,})$/i, "$1")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!pulito) return ""

  return pulito
    .split(" ")
    .map(
      (parte) =>
        parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase(),
    )
    .join(" ")
}