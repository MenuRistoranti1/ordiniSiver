"use client"

import { useRef, useState } from "react"
import { UploadCloud } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Props = {
  onUploaded?: () => void
}

export function DocumentsDropzone({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    setUploading(true)
    setMessage(null)

    try {
      for (const file of Array.from(files)) {
        const safeName = file.name.replaceAll(" ", "_")
        const path = `${Date.now()}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(path, file)

        if (uploadError) throw uploadError

        const { data: insertedDocument, error: insertError } = await supabase
          .from("documents")
          .insert({
            file_name: file.name,
            file_type: file.type || "unknown",
            file_url: path,
            status: "uploaded",
          })
          .select("id")
          .single()

        if (insertError) throw insertError
        if (!insertedDocument?.id) throw new Error("Documento non creato")

        await fetch("/api/documents/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: insertedDocument.id,
          }),
        })
      }

      setMessage("Documento caricato ed elaborato correttamente.")
      onUploaded?.()
    } catch (error) {
      console.error(error)
      setMessage("Errore durante il caricamento o l'elaborazione.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        handleFiles(event.dataTransfer.files)
      }}
      className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.xml,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <UploadCloud className="h-7 w-7" />
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        Carica documenti
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Trascina qui PDF, XML o immagini, oppure selezionali dal computer.
      </p>

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? "Caricamento..." : "Seleziona file"}
      </button>

      {message && (
        <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>
      )}
    </div>
  )
}