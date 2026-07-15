
"use client"

import { useState } from "react"
import { DocumentsDropzone } from "@/components/admin/documenti/DocumentsDropzone"
import { DocumentsStats } from "@/components/admin/documenti/DocumentsStats"
import { CompanyRestaurantLinks } from "@/components/admin/documenti/CompanyRestaurantLinks"
import { DocumentsTable } from "@/components/admin/documenti/DocumentsTable"

import {
  AlertTriangle,
  Bot,
  Clock,
  FileText,
  Link2,
  Sparkles,
  Table,
} from "lucide-react"

export default function AdminDocumentiPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  function refreshDocuments() {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Documenti</h1>
          <p className="mt-1 text-slate-500">
            Importazione, controllo e analisi di fatture, inevasi e documenti
            fornitori.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Alias prodotti
          </button>

          <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            Nuovo import
          </button>
        </div>
      </div>

      <DocumentsStats
        documents={0}
        totalRows={0}
        matchedRows={0}
        anomalies={0}
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <DocumentsDropzone onUploaded={refreshDocuments} />

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Bot className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Assistente AI documenti
              </h2>
              <p className="text-sm text-slate-500">
                Analizza fatture, abbina prodotti e segnala anomalie.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <Action
              icon={<Sparkles />}
              title="Leggi automaticamente i PDF"
              text="Estrazione righe, quantità, prezzi e fornitore."
            />
            <Action
              icon={<Link2 />}
              title="Collega prodotti e alias"
              text="Abbina descrizioni fornitore ai prodotti interni."
            />
            <Action
              icon={<AlertTriangle />}
              title="Segnala anomalie"
              text="Prezzi aumentati, prodotti non riconosciuti e righe sospette."
            />
          </div>
        </div>
      </div>

      <CompanyRestaurantLinks />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
        <DocumentsTable refreshKey={refreshKey} />

        <div className="space-y-6">
          <Panel
            icon={<Clock />}
            title="Coda elaborazione"
            text="Nessun documento in elaborazione."
          />

          <Panel
            icon={<Table />}
            title="Prodotti senza match"
            text="Qui vedrai i prodotti che il sistema non riesce ad abbinare."
          />

          <Panel
            icon={<FileText />}
            title="Ultimo import"
            text="Nessun import ancora disponibile."
          />
        </div>
      </div>
    </div>
  )
}

function Action({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="flex gap-3 rounded-xl border bg-slate-50 p-4">
      <div className="text-blue-600 [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{text}</p>
      </div>
    </div>
  )
}

function Panel({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-3 text-slate-600 [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </div>

        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{text}</p>
        </div>
      </div>
    </div>
  )
}