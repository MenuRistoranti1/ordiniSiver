"use client"

import {
  Edit,
  KeyRound,
  MapPinned,
  Power,
  Trash2,
} from "lucide-react"

import Badge from "@/components/ui/Badge"
import ActionMenu from "@/components/ui/ActionMenu"
import DataTable, {
  type DataTableColumn,
} from "@/components/ui/DataTable"

import type { UtenteLocale } from "../types"

type Props = {
  utenti: UtenteLocale[]

  onEdit: (utente: UtenteLocale) => void

  onPassword: (utente: UtenteLocale) => void

  onDelete: (utente: UtenteLocale) => void

  onToggle: (utente: UtenteLocale) => void

  onLocale: (utente: UtenteLocale) => void
}

export default function UsersTable({
  utenti,
  onEdit,
  onPassword,
  onDelete,
  onToggle,
  onLocale,
}: Props) {
  const columns: DataTableColumn<UtenteLocale>[] = [
    {
      key: "nome",
      header: "Utente",
      render: (u) => (
        <div>
          <div className="font-black text-slate-900">
            {u.nome} {u.cognome}
          </div>

          <div className="text-xs text-slate-500">
            @{u.utente}
          </div>
        </div>
      ),
    },

    {
      key: "locale",
      header: "Locale",
      render: (u) => (
        <span className="font-semibold">
          {u.locale_nome || "-"}
        </span>
      ),
    },

    {
      key: "stato",
      header: "Stato",
      render: (u) =>
        u.active ? (
          <Badge variant="success">
            Attivo
          </Badge>
        ) : (
          <Badge variant="danger">
            Disattivato
          </Badge>
        ),
    },

    {
      key: "ultimo",
      header: "Ultimo accesso",
      render: (u) =>
        u.last_login ? (
          new Date(u.last_login).toLocaleString("it-IT")
        ) : (
          <span className="text-slate-400">
            Mai
          </span>
        ),
    },

    {
      key: "azioni",
      header: "",
      className: "w-20",

      render: (u) => (
        <ActionMenu
          actions={[
            {
              label: "Modifica utente",
              icon: <Edit size={16} />,
              onClick: () => onEdit(u),
            },

            {
              label: "Reset password",
              icon: <KeyRound size={16} />,
              onClick: () => onPassword(u),
            },

            {
              label: "Cambia locale",
              icon: <MapPinned size={16} />,
              onClick: () => onLocale(u),
            },

            {
              label: u.active
                ? "Disattiva"
                : "Attiva",

              icon: <Power size={16} />,

              onClick: () => onToggle(u),
            },

            {
              label: "Elimina",

              danger: true,

              icon: <Trash2 size={16} />,

              onClick: () => onDelete(u),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={utenti}
      keyExtractor={(u) => u.id}
      emptyTitle="Nessun utente trovato"
      emptyDescription="Prova a modificare i filtri oppure crea un nuovo utente."
    />
  )
}