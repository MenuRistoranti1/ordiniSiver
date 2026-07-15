"use client"

import { FileText, PackageSearch, AlertTriangle, CheckCircle2 } from "lucide-react"

type Props = {
  documents: number
  totalRows: number
  matchedRows: number
  anomalies: number
}

export function DocumentsStats({
  documents,
  totalRows,
  matchedRows,
  anomalies,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Stat title="Documenti" value={documents} icon={<FileText />} />
      <Stat title="Righe" value={totalRows} icon={<PackageSearch />} />
      <Stat title="Riconosciuti" value={matchedRows} icon={<CheckCircle2 />} />
      <Stat title="Anomalie" value={anomalies} icon={<AlertTriangle />} />
    </div>
  )
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">{icon}</div>
      </div>
    </div>
  )
}