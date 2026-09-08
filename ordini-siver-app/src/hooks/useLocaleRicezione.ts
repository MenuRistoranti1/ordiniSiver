"use client"

import { useEffect, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useToast } from "@/components/Toast"
import { supabase } from "@/lib/supabase"
import {
  caricaRicezione,
  chiudiRicezione,
  salvaBozzaRiga,
  segnalaRigheSenzaOrdine,
  statoDaQuantita,
} from "@/services/ricezione.service"
import { settimanaKeyCorrente } from "@/lib/settimana"
import type { Ricezione, RigaRicezione } from "@/types/ricezione"

export function useLocaleRicezione() {
  const { showToast } = useToast()

  const [localeId, setLocaleId] = useState("")
  const [localeNome, setLocaleNome] = useState("")
  const [operatore, setOperatore] = useState("Operatore")
  const [dati, setDati] = useState<Ricezione>({
    righe: [],
    senzaOrdine: [],
    documenti: [],
  })
  const [loading, setLoading] = useState(true)
  /** Operazione in corso: blocca i pulsanti mentre si scrive sul server. */
  const [inSalvataggio, setInSalvataggio] = useState<string | null>(null)
  const [ultimoSalvataggio, setUltimoSalvataggio] = useState<string | null>(null)
  const [segnalazioneInviata, setSegnalazioneInviata] = useState(false)

  const timerBozza = useRef<Record<string, number>>({})
  const righeRef = useRef<RigaRicezione[]>([])

  useEffect(() => {
    void inizializza()
  }, [])

  useEffect(() => {
    righeRef.current = dati.righe
  }, [dati.righe])

  async function inizializza() {
    setLoading(true)

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user || user.app_metadata?.role !== "locale") {
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
        window.location.href = "/"
        return
      }

      setLocaleId(id)
      setLocaleNome(nome)
      setOperatore(nomeOperatore(user))

      await ricarica(id)
    } catch (errore) {
      console.log(errore)
      showToast("Errore durante il caricamento della ricezione", "error")
    } finally {
      setLoading(false)
    }
  }

  async function ricarica(id = localeId) {
    if (!id) return

    try {
      setDati(await caricaRicezione(id, settimanaKeyCorrente()))
    } catch (errore) {
      console.log(errore)
      showToast("Errore nel caricamento dei dati di ricezione", "error")
    }
  }

  /*
    La quantità si salva subito sul server, ma come bozza: la riga resta
    modificabile finché la ricezione non viene chiusa. Il salvataggio è
    ritardato di 600ms dall'ultima battuta, per non scrivere a ogni cifra.
  */
  function cambiaQuantita(ordineId: string, valore: string) {
    const numero = Math.max(0, Number(valore.replace(/\D/g, "") || 0))

    setDati((attuali) => ({
      ...attuali,
      righe: attuali.righe.map((riga) =>
        riga.ordineId === ordineId
          ? {
              ...riga,
              quantitaConsegnata: numero,
              statoConsegna: statoDaQuantita(riga.quantitaOrdinata, numero),
            }
          : riga,
      ),
    }))

    const attesa = timerBozza.current[ordineId]
    if (attesa) window.clearTimeout(attesa)

    timerBozza.current[ordineId] = window.setTimeout(() => {
      void salvaBozza(ordineId, numero)
    }, 600)
  }

  async function salvaBozza(ordineId: string, quantita: number) {
    const riga = righeRef.current.find((item) => item.ordineId === ordineId)
    if (!riga || riga.validataIl) return

    try {
      await salvaBozzaRiga({
        ordineId,
        quantitaOrdinata: riga.quantitaOrdinata,
        quantitaConsegnata: quantita,
      })

      setUltimoSalvataggio(new Date().toISOString())
    } catch (errore) {
      console.log(errore)
      showToast("Errore nel salvataggio automatico", "error")
    }
  }

  /*
    Chiusura definitiva. È l'unico passaggio irreversibile per il locale,
    quindi la pagina la fa precedere da una conferma esplicita.
  */
  async function chiudi() {
    const daChiudere = dati.righe.filter((riga) => !riga.validataIl)

    if (daChiudere.length === 0) {
      showToast("La ricezione è già stata chiusa", "info")
      return
    }

    setInSalvataggio("chiusura")

    try {
      // Prima si assicura che l'ultima modifica sia sul server, poi firma.
      for (const riga of daChiudere) {
        await salvaBozzaRiga({
          ordineId: riga.ordineId,
          quantitaOrdinata: riga.quantitaOrdinata,
          quantitaConsegnata: riga.quantitaConsegnata,
        })
      }

      await chiudiRicezione({
        ordineIds: daChiudere.map((riga) => riga.ordineId),
        operatore,
      })

      showToast("Ricezione chiusa e salvata", "success")
      await ricarica()
    } catch (errore) {
      console.log(errore)
      showToast("Errore durante la chiusura della ricezione", "error")
    } finally {
      setInSalvataggio(null)
    }
  }

  async function segnalaAdmin() {
    if (dati.senzaOrdine.length === 0) return

    setInSalvataggio("segnalazione")

    try {
      await segnalaRigheSenzaOrdine({
        localeId,
        localeNome,
        operatore,
        righe: dati.senzaOrdine,
      })

      setSegnalazioneInviata(true)
      showToast("Segnalazione inviata all'amministrazione", "success")
    } catch (errore) {
      console.log(errore)
      showToast("Errore nell'invio della segnalazione", "error")
    } finally {
      setInSalvataggio(null)
    }
  }

  const totali = {
    righe: dati.righe.length,
    validate: dati.righe.filter((riga) => riga.validataIl).length,
    conDifferenza: dati.righe.filter(
      (riga) => riga.quantitaConsegnata !== riga.quantitaOrdinata,
    ).length,
    senzaDocumento: dati.righe.filter(
      (riga) => riga.daFattura === null && riga.daInevaso === null,
    ).length,
  }

  return {
    localeNome,
    operatore,
    loading,
    inSalvataggio,
    righe: dati.righe,
    senzaOrdine: dati.senzaOrdine,
    documenti: dati.documenti,
    totali,
    ultimoSalvataggio,
    segnalazioneInviata,
    chiusa: dati.righe.length > 0 && dati.righe.every((riga) => riga.validataIl),
    cambiaQuantita,
    chiudi,
    segnalaAdmin,
    ricarica,
  }
}

function nomeOperatore(user: User) {
  const meta = user.user_metadata || {}
  const app = user.app_metadata || {}

  const nome =
    meta.full_name || meta.name || meta.nome || app.full_name || app.nome || ""

  if (nome && !String(nome).includes("@")) return String(nome).trim()

  const parteLocale = String(user.email || "").split("@")[0] || "Operatore"

  return parteLocale
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (lettera) => lettera.toUpperCase())
    .trim()
}
