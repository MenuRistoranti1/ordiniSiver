"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useToast } from "@/components/Toast"
import { supabase } from "@/lib/supabase"
import {
  caricaRicezione,
  registraConsegna,
  segnalaRigheSenzaOrdine,
  statoDaQuantita,
} from "@/services/ricezione.service"
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
  const [inSalvataggio, setInSalvataggio] = useState<string | null>(null)
  const [segnalazioneInviata, setSegnalazioneInviata] = useState(false)

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
      setDati(await caricaRicezione(id))
    } catch (errore) {
      console.log(errore)
      showToast("Errore nel caricamento dei dati di ricezione", "error")
    }
  }

  /*
    La quantità in arrivo resta locale finché non si conferma: qui si registra
    una consegna, cioè un fatto, e un fatto va scritto quando l'operatore dice
    che è così, non mentre sta ancora contando.
  */
  function cambiaQuantita(ordineId: string, valore: string) {
    const numero = Math.max(0, Number(valore.replace(/\D/g, "") || 0))

    setDati((attuali) => ({
      ...attuali,
      righe: attuali.righe.map((riga) =>
        riga.ordineId === ordineId ? { ...riga, inArrivo: numero } : riga,
      ),
    }))
  }

  async function confermaRiga(riga: RigaRicezione) {
    if (inSalvataggio) return

    setInSalvataggio(riga.ordineId)

    try {
      await registraConsegna({
        ordineId: riga.ordineId,
        quantitaOrdinata: riga.quantitaOrdinata,
        giaRicevuta: riga.giaRicevuta,
        inArrivo: riga.inArrivo,
        operatore,
        documentRowIds: riga.documentRowIds,
      })

      await ricarica()
    } catch (errore) {
      console.log(errore)
      showToast("Errore nel salvataggio della consegna", "error")
    } finally {
      setInSalvataggio(null)
    }
  }

  /** Registra in blocco tutte le righe con una quantità in arrivo. */
  async function confermaTutte() {
    const daRegistrare = dati.righe.filter((riga) => riga.inArrivo > 0)

    if (daRegistrare.length === 0) {
      showToast("Nessuna quantità da registrare", "info")
      return
    }

    setInSalvataggio("tutte")

    try {
      for (const riga of daRegistrare) {
        await registraConsegna({
          ordineId: riga.ordineId,
          quantitaOrdinata: riga.quantitaOrdinata,
          giaRicevuta: riga.giaRicevuta,
          inArrivo: riga.inArrivo,
          operatore,
          documentRowIds: riga.documentRowIds,
        })
      }

      showToast(`${daRegistrare.length} righe registrate`, "success")
      await ricarica()
    } catch (errore) {
      console.log(errore)
      showToast("Errore durante la registrazione", "error")
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
    daRicevere: dati.righe.reduce((somma, riga) => somma + riga.residuo, 0),
    conProposta: dati.righe.filter((riga) => riga.propostaDaDocumenti > 0)
      .length,
    inRitardo: dati.righe.filter((riga) => riga.settimaneDiAttesa >= 2).length,
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
    segnalazioneInviata,
    statoDaQuantita,
    cambiaQuantita,
    confermaRiga,
    confermaTutte,
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
