"use client"

import {
  Download,
  Eye,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react"
import { LocaleShell } from "@/components/locale/LocaleShell"
import { useLocaleDocuments } from "@/hooks/useLocaleDocuments"
import type { LocaleDocument } from "@/types/documents"

export default function DocumentiLocalePage() {
  const {
    filteredDocuments,
    search,
    setSearch,
    loading,
    openingId,
    restaurantId,
    restaurantName,
    aggiornaDocumenti,
    apriDocumento,
  } = useLocaleDocuments()

  return (
    <LocaleShell>
      <header className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              Documenti locale
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Documenti
            </h1>

            <p className="mt-1 text-sm font-bold text-slate-500">
              Qui trovi i documenti caricati dall&apos;amministrazione per{" "}
              {restaurantName}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void aggiornaDocumenti()}
            disabled={loading || !restaurantId}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:bg-slate-400"
          >
            <RefreshCw
              className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Aggiorno..." : "Aggiorna"}
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">
                Documenti disponibili
              </h2>

              <p className="text-sm font-bold text-slate-500">
                Puoi aprire o scaricare i documenti associati al tuo locale.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <Search className="h-4 w-4 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca documento..."
              className="w-52 bg-transparent text-sm font-bold outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-5 text-sm font-bold text-slate-500">
              Caricamento documenti...
            </div>
          ) : !restaurantId ? (
            <div className="p-5 text-sm font-bold text-red-600">
              Locale non riconosciuto. Effettua di nuovo l&apos;accesso.
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-5 text-sm font-bold text-slate-500">
              Nessun documento disponibile.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-black">Documento</th>
                  <th className="px-5 py-3 font-black">Tipo</th>
                  <th className="px-5 py-3 font-black">Stato</th>
                  <th className="px-5 py-3 font-black">Data</th>
                  <th className="px-5 py-3 font-black text-right">Azioni</th>
                </tr>
              </thead>

              <tbody>
                {filteredDocuments.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    opening={openingId === document.id}
                    onOpen={() => void apriDocumento(document)}
                    onDownload={() =>
                      void apriDocumento(document, "download")
                    }
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </LocaleShell>
  )
}

function DocumentRow({
  document,
  opening,
  onOpen,
  onDownload,
}: {
  document: LocaleDocument
  opening: boolean
  onOpen: () => void
  onDownload: () => void
}) {
  return (
    <tr className="border-t border-slate-200">
      <td className="px-5 py-4 font-black text-slate-900">
        {document.file_name}
      </td>

      <td className="px-5 py-4 font-bold text-slate-600">
        {formatFileType(document.file_type)}
      </td>

      <td className="px-5 py-4">
        <span className={statusClass(document.status)}>
          {formatStatus(document.status)}
        </span>
      </td>

      <td className="px-5 py-4 font-bold text-slate-600">
        {formatDate(document.created_at)}
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onOpen}
            disabled={opening}
            className="rounded-xl border border-slate-200 bg-white p-2 text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
            title="Apri"
          >
            <Eye className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onDownload}
            disabled={opening}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            title="Scarica"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatStatus(status: string) {
  if (status === "uploaded") return "Caricato"
  if (status === "processing") return "In elaborazione"
  if (status === "processed") return "Disponibile"
  if (status === "error") return "Errore"
  return status
}

function statusClass(status: string) {
  if (status === "processed") {
    return "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
  }

  if (status === "error") {
    return "rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700"
  }

  if (status === "processing") {
    return "rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
  }

  return "rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700"
}

function formatFileType(type: string | null) {
  if (!type) return "-"
  if (type.includes("pdf")) return "PDF"
  if (type.includes("xml")) return "XML"
  if (type.includes("image")) return "IMG"
  return type
}