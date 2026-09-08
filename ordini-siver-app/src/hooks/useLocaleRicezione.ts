"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useToast } from "@/components/Toast"
import { supabase } from "@/lib/supabase"
import {
  caricaRicezione,
  statoDaQuantita,
  validaRigaRicezione,
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
  /** Riga attualmente in salvataggio, per bloccare solo quella. */
  const [inSalvataggio, setInSalvataggio] = useState<string | null>(null)

  useEffect(() => {
    void inizializza()
  }, [])

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

  /** Modifica locale della quantità, senza toccare il server. */
  function cambiaQuantita(ordineId: string, valore: string) {
    const numero = Math.max(0, Number(valore.replace(/\D/g, "") || 0))

    setDati((attuali) => ({
      ...attuali,
      righe: attuali.righe.map((riga) =>
        riga.ordineId === ordineId
          ? { ...riga, quantitaConsegnata: numero }
          : riga,
      ),
    }))
  }

  /*
    La conferma scrive subito sulla riga d'ordine: se il collega apre la
    schermata mentre il magazzino viene scaricato, deve vedere quello che è
    già stato controllato e riprendere da lì.
  */
  async function confermaRiga(riga: RigaRicezione) {
    if (inSalvataggio) return

    setInSalvataggio(riga.ordineId)

    try {
      await validaRigaRicezione({
        ordineId: riga.ordineId,
        quantitaOrdinata: riga.quantitaOrdinata,
        quantitaConsegnata: riga.quantitaConsegnata,
        operatore,
      })

      setDati((attuali) => ({
        ...attuali,
        righe: attuali.righe.map((item) =>
          item.ordineId === riga.ordineId
            ? {
                ...item,
                statoConsegna: statoDaQuantita(
                  item.quantitaOrdinata,
                  item.quantitaConsegnata,
                ),
                validataDa: operatore,
                validataIl: new Date().toISOString(),
              }
            : item,
        ),
      }))
    } catch (errore) {
      console.log(errore)
      showToast("Errore nel salvataggio della riga", "error")
    } finally {
      setInSalvataggio(null)
    }
  }

  async function confermaTutte() {
    const daConfermare = dati.righe.filter((riga) => !riga.validataIl)

    if (daConfermare.length === 0) {
      showToast("Tutte le righe sono già state validate", "info")
      return
    }

    setInSalvataggio("tutte")

    try {
      for (const riga of daConfermare) {
        await validaRigaRicezione({
          ordineId: riga.ordineId,
          quantitaOrdinata: riga.quantitaOrdinata,
          quantitaConsegnata: riga.quantitaConsegnata,
          operatore,
        })
      }

      showToast(`${daConfermare.length} righe validate`, "success")
      await ricarica()
    } catch (errore) {
      console.log(errore)
      showToast("Errore durante la validazione", "error")
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
    cambiaQuantita,
    confermaRiga,
    confermaTutte,
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
