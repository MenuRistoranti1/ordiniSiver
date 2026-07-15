"use client"

import { useEffect, useState } from "react"
import { Download, Eye, Search, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

type DocumentRow = {
  id: string
  file_name: string
  file_type: string | null
  file_url: string | null
  supplier_name: string | null
  restaurant_name: string | null
  total_amount: number | null
  status: string
  created_at: string
}

export function DocumentsTable({ refreshKey = 0 }: { refreshKey?: number }) {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDocuments()
  }, [refreshKey])

  async function loadDocuments() {
    setLoading(true)

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, file_name, file_type, file_url, supplier_name, restaurant_name, total_amount, status, created_at"
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      setDocuments([])
    } else {
      setDocuments(data ?? [])
    }

    setLoading(false)
  }

  async function openDocument(fileUrl: string | null, download = false) {
    if (!fileUrl) {
      alert("File non disponibile")
      return
    }

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(fileUrl, 60)

    if (error || !data?.signedUrl) {
      alert("Errore apertura documento")
      console.error(error)
      return
    }

    if (download) {
      const link = document.createElement("a")
      link.href = data.signedUrl
      link.download = ""
      link.click()
      return
    }

    window.open(data.signedUrl, "_blank")
  }

  async function deleteDocument(doc: DocumentRow) {
    const ok = confirm("Vuoi eliminare questo documento?")
    if (!ok) return

    if (doc.file_url) {
      await supabase.storage.from("documents").remove([doc.file_url])
    }

    const { error } = await supabase.from("documents").delete().eq("id", doc.id)

    if (error) {
      alert("Errore eliminazione documento")
      console.error(error)
      return
    }

    loadDocuments()
  }

  const filtered = documents.filter((doc) => {
    const text = [
      doc.file_name,
      doc.supplier_name,
      doc.restaurant_name,
      doc.status,
      doc.file_type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return text.includes(search.toLowerCase())
  })

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b p-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Storico documenti
          </h2>
          <p className="text-sm text-slate-500">
            Lista dei documenti importati e stato elaborazione.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca documento..."
            className="w-52 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-5 text-sm text-slate-500">
            Caricamento documenti...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            Nessun documento trovato.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Documento</th>
                <th className="px-5 py-3 font-medium">Fornitore</th>
                <th className="px-5 py-3 font-medium">Locale</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Stato</th>
                <th className="px-5 py-3 font-medium">Totale</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium text-right">Azioni</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {doc.file_name}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {doc.supplier_name ?? "-"}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {doc.restaurant_name ?? "-"}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {formatFileType(doc.file_type)}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {formatStatus(doc.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {formatCurrency(doc.total_amount)}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {formatDate(doc.created_at)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openDocument(doc.file_url)}
                        className="rounded-xl border bg-white p-2 text-blue-600 hover:bg-blue-50"
                        title="Apri"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openDocument(doc.file_url, true)}
                        className="rounded-xl border bg-white p-2 text-slate-600 hover:bg-slate-50"
                        title="Scarica"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteDocument(doc)}
                        className="rounded-xl border bg-white p-2 text-red-600 hover:bg-red-50"
                        title="Elimina"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value ?? 0)
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
  if (status === "processed") return "Elaborato"
  if (status === "error") return "Errore"
  return status
}

function formatFileType(type: string | null) {
  if (!type) return "-"
  if (type.includes("pdf")) return "PDF"
  if (type.includes("xml")) return "XML"
  if (type.includes("image")) return "IMG"
  return type
}