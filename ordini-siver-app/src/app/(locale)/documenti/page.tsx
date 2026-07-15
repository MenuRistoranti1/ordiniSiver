"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ClipboardList,
  Download,
  Eye,
  FileText,
  Home,
  MessageCircle,
  Package,
  Search,
  Send,
  Warehouse,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { LocaleMobileHeader } from "@/components/LocaleMobileHeader"

type DocumentRow = {
  id: string
  file_name: string
  file_type: string | null
  file_url: string | null
  status: string
  created_at: string
  read_by_locale: boolean | null
  read_at: string | null
}

export default function DocumentiLocalePage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState("Locale")

  const [messaggiNonLetti, setMessaggiNonLetti] = useState(0)
  const [documentiNonLetti, setDocumentiNonLetti] = useState(0)

  useEffect(() => {
    inizializzaPagina()
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

    await Promise.all([
      loadDocuments(id),
      loadUnreadMessages(id),
    ])
  }

  async function loadDocuments(id: string) {
    setLoading(true)

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, file_name, file_type, file_url, status, created_at, read_by_locale, read_at"
      )
      .eq("restaurant_id", id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Errore caricamento documenti:", error)
      setDocuments([])
      setDocumentiNonLetti(0)
    } else {
      const rows = (data ?? []) as DocumentRow[]

      setDocuments(rows)
      setDocumentiNonLetti(
        rows.filter((documento) => documento.read_by_locale !== true).length
      )
    }

    setLoading(false)
  }

  async function loadUnreadMessages(id: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("id")
      .eq("locale_id", id)
      .eq("sender", "admin")
      .eq("is_read", false)

    if (error) {
      console.error("Errore caricamento messaggi:", error)
      setMessaggiNonLetti(0)
      return
    }

    setMessaggiNonLetti((data || []).length)
  }

  async function markDocumentAsRead(documentId: string) {
    const documento = documents.find((item) => item.id === documentId)

    if (!documento || documento.read_by_locale === true) {
      return
    }

    const readAt = new Date().toISOString()

    const { error } = await supabase
      .from("documents")
      .update({
        read_by_locale: true,
        read_at: readAt,
      })
      .eq("id", documentId)

    if (error) {
      console.error("Errore aggiornamento lettura documento:", error)
      throw error
    }

    setDocuments((current) =>
      current.map((item) =>
        item.id === documentId
          ? {
              ...item,
              read_by_locale: true,
              read_at: readAt,
            }
          : item
      )
    )

    setDocumentiNonLetti((current) => Math.max(0, current - 1))
  }

  async function openDocument(
    documentId: string,
    fileUrl: string | null,
    download = false
  ) {
    if (!fileUrl) {
      alert("File non disponibile")
      return
    }

    setOpeningId(documentId)

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(fileUrl, 60, {
          download,
        })

      if (error || !data?.signedUrl) {
        throw error || new Error("URL documento non disponibile")
      }

      await markDocumentAsRead(documentId)

      if (download) {
        const link = document.createElement("a")
        link.href = data.signedUrl
        link.download = ""
        document.body.appendChild(link)
        link.click()
        link.remove()
        return
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("Errore apertura documento:", error)
      alert("Errore durante l'apertura del documento")
    } finally {
      setOpeningId(null)
    }
  }

  function vai(percorso: string) {
    window.location.href = percorso
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return documents

    return documents.filter((documento) =>
      [
        documento.file_name,
        documento.status,
        documento.file_type,
        documento.read_by_locale ? "letto" : "nuovo non letto",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [documents, search])

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100">
      <div className="flex min-h-screen w-full">
        <aside className="fixed left-0 top-0 hidden h-screen w-72 shrink-0 flex-col bg-slate-950 p-5 text-white lg:flex">
          <div className="mb-4 rounded-3xl bg-slate-900 p-4">
            <h1 className="text-2xl font-black tracking-tight">
              OrdiniSiver
            </h1>

            <p className="mt-1 text-xs font-bold text-slate-300">
              Area Locale
            </p>
          </div>

          <div className="mb-5 rounded-3xl bg-slate-900 p-3">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
              Locale attivo
            </p>

            <div className="rounded-2xl bg-slate-800 px-3 py-3 text-sm font-black text-white">
              {restaurantName}
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
            <SidebarButton
              label="Dashboard"
              icon={Home}
              onClick={() => vai("/dashboard")}
            />

            <SidebarButton
              label="Giacenze settimana"
              icon={Warehouse}
              onClick={() => vai("/giacenze")}
            />

            <SidebarButton
              label="Nuovo ordine"
              icon={Send}
              onClick={() => vai("/nuovo-ordine")}
            />

            <SidebarButton
              label="Storico giacenze"
              icon={Package}
              onClick={() => vai("/storico-giacenze")}
            />

            <SidebarButton
              label="Storico ordini"
              icon={ClipboardList}
              onClick={() => vai("/storico-ordini")}
            />

            <SidebarButton
              label="Documenti"
              active
              icon={FileText}
              onClick={() => vai("/documenti")}
              badge={documentiNonLetti}
            />

            <SidebarButton
              label="Messaggi admin"
              icon={MessageCircle}
              onClick={() => vai("/messaggi")}
              badge={messaggiNonLetti}
            />
          </nav>
        </aside>

        <section className="min-w-0 flex-1 px-3 py-4 sm:px-5 lg:ml-72 lg:px-6 xl:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-4">
            <LocaleMobileHeader unreadCount={messaggiNonLetti} />

            <header className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                    Documenti locale
                  </p>

                  <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                    Documenti
                  </h1>

                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Documenti caricati dall&apos;amministrazione per{" "}
                    {restaurantName}.
                  </p>
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 ${
                    documentiNonLetti > 0
                      ? "bg-red-50 text-red-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-wide">
                    Documenti nuovi
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {documentiNonLetti}
                  </p>
                </div>
              </div>
            </header>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b p-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                    <FileText className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Documenti disponibili
                    </h2>

                    <p className="text-sm font-bold text-slate-500">
                      Apri o scarica i documenti associati al tuo locale.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-3">
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
                ) : filtered.length === 0 ? (
                  <div className="p-5 text-sm font-bold text-slate-500">
                    Nessun documento disponibile.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-black">Documento</th>
                        <th className="px-5 py-3 font-black">Tipo</th>
                        <th className="px-5 py-3 font-black">Lettura</th>
                        <th className="px-5 py-3 font-black">Data</th>
                        <th className="px-5 py-3 font-black text-right">
                          Azioni
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.map((documento) => {
                        const nuovo = documento.read_by_locale !== true
                        const isOpening = openingId === documento.id

                        return (
                          <tr
                            key={documento.id}
                            className={`border-t ${
                              nuovo ? "bg-amber-50/70" : "bg-white"
                            }`}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-black text-slate-900">
                                    {documento.file_name}
                                  </p>

                                  {nuovo && (
                                    <span className="mt-1 inline-flex rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                      Nuovo
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 font-bold text-slate-600">
                              {formatFileType(documento.file_type)}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${
                                  nuovo
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {nuovo ? "Da leggere" : "Letto"}
                              </span>

                              {!nuovo && documento.read_at && (
                                <p className="mt-1 text-[11px] font-bold text-slate-400">
                                  {formatDate(documento.read_at)}
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-4 font-bold text-slate-600">
                              {formatDate(documento.created_at)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={isOpening}
                                  onClick={() =>
                                    openDocument(
                                      documento.id,
                                      documento.file_url
                                    )
                                  }
                                  className="rounded-xl border bg-white p-2 text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Apri"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  disabled={isOpening}
                                  onClick={() =>
                                    openDocument(
                                      documento.id,
                                      documento.file_url,
                                      true
                                    )
                                  }
                                  className="rounded-xl border bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Scarica"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function SidebarButton({
  label,
  active,
  onClick,
  icon: Icon,
  badge,
}: {
  label: string
  active?: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
          : "text-slate-200 hover:translate-x-1 hover:bg-slate-800"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        {label}
      </span>

      {!!badge && badge > 0 && (
        <span className="animate-pulse rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
          {badge}
        </span>
      )}
    </button>
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

function formatFileType(type: string | null) {
  if (!type) return "-"

  if (type.includes("pdf")) return "PDF"
  if (type.includes("xml")) return "XML"
  if (type.includes("image")) return "IMG"

  return type
}