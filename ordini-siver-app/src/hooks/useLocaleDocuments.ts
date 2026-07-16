"use client"

import { useEffect, useMemo, useState } from "react"
import { useToast } from "@/components/Toast"
import {
  caricaDocumentiLocale,
  creaUrlDocumento,
} from "@/services/documents.service"
import type {
  DocumentOpenMode,
  LocaleDocument,
} from "@/types/documents"

export function useLocaleDocuments() {
  const { showToast } = useToast()

  const [documents, setDocuments] = useState<LocaleDocument[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState("Locale")

  useEffect(() => {
    void inizializzaPagina()
  }, [])

  async function inizializzaPagina() {
    const id = localStorage.getItem("locale_id")
    const nome = localStorage.getItem("locale_nome") || "Locale"

    setRestaurantId(id)
    setRestaurantName(nome)

    if (!id) {
      setLoading(false)
      return
    }

    await aggiornaDocumenti(id, false)
  }

  async function aggiornaDocumenti(
    id = restaurantId,
    mostraMessaggio = true,
  ) {
    if (!id) return

    setLoading(true)

    try {
      const data = await caricaDocumentiLocale(id)
      setDocuments(data)

      if (mostraMessaggio) {
        showToast("Documenti aggiornati", "success")
      }
    } catch (error) {
      console.error("Errore caricamento documenti:", error)
      setDocuments([])
      showToast("Errore durante il caricamento dei documenti", "error")
    } finally {
      setLoading(false)
    }
  }

  async function apriDocumento(
    document: LocaleDocument,
    mode: DocumentOpenMode = "view",
  ) {
    if (!document.file_url) {
      showToast("File non disponibile", "warning")
      return
    }

    setOpeningId(document.id)

    try {
      const signedUrl = await creaUrlDocumento(document.file_url, mode)

      if (mode === "download") {
        const link = window.document.createElement("a")
        link.href = signedUrl
        link.download = document.file_name
        link.rel = "noopener noreferrer"
        window.document.body.appendChild(link)
        link.click()
        link.remove()
        return
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("Errore apertura documento:", error)
      showToast("Errore durante l'apertura del documento", "error")
    } finally {
      setOpeningId(null)
    }
  }

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return documents

    return documents.filter((document) =>
      [document.file_name, document.status, document.file_type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
  }, [documents, search])

  return {
    documents,
    filteredDocuments,
    search,
    setSearch,
    loading,
    openingId,
    restaurantId,
    restaurantName,
    aggiornaDocumenti,
    apriDocumento,
  }
}
