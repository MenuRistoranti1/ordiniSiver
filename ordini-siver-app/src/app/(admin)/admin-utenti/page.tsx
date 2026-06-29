"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import CrudPage from "@/components/crud/CrudPage"
import CrudToolbar from "@/components/crud/CrudToolbar"
import Loading from "@/components/ui/Loading"
import UsersStats from "./components/UsersStats"
import UsersFilters from "./components/UsersFilters"
import UserCreateForm from "./components/UserCreateForm"
import UsersTable from "./components/UsersTable"
import EditUserModal from "./components/EditUserModal"
import ResetPasswordModal from "./components/ResetPasswordModal"
import DeleteUserDialog from "./components/DeleteUserDialog"
import { useAdminUsers } from "./hooks/useAdminUsers"
import type { UtenteLocale } from "./types"

export default function AdminUtentiPage() {
  const users = useAdminUsers()

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UtenteLocale | null>(null)
  const [passwordUser, setPasswordUser] = useState<UtenteLocale | null>(null)
  const [deleteUser, setDeleteUser] = useState<UtenteLocale | null>(null)

  useEffect(() => {
    users.caricaDati()
  }, [])

  if (users.loading) {
    return <Loading title="Caricamento utenti..." />
  }

  return (
    <CrudPage
      eyebrow="Amministrazione"
      title="Gestione utenti locali"
      description="Crea, modifica, disattiva e assegna gli utenti ai locali."
      actions={
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuovo utente
        </button>
      }
    >
      {users.messaggio && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          {users.messaggio}
        </div>
      )}

      {users.errore && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {users.errore}
        </div>
      )}

      <UsersStats statistiche={users.statistiche} />

      <CrudToolbar>
        <UsersFilters
          ricerca={users.ricerca}
          setRicerca={users.setRicerca}
          filtroLocale={users.filtroLocale}
          setFiltroLocale={users.setFiltroLocale}
          locali={users.locali}
        />
      </CrudToolbar>

      <UsersTable
        utenti={users.utentiFiltrati}
        onEdit={setEditUser}
        onPassword={setPasswordUser}
        onDelete={setDeleteUser}
        onLocale={setEditUser}
        onToggle={(utente) => users.cambiaStato(utente.id, !utente.active)}
      />

      <UserCreateForm
        open={createOpen}
        locali={users.locali}
        loading={users.saving}
        onClose={() => setCreateOpen(false)}
        onCreate={users.creaUtente}
      />

      <EditUserModal
        utente={editUser}
        locali={users.locali}
        loading={users.saving}
        onClose={() => setEditUser(null)}
        onSave={users.aggiornaUtente}
      />

      <ResetPasswordModal
        utente={passwordUser}
        loading={users.saving}
        onClose={() => setPasswordUser(null)}
        onSave={users.resetPassword}
      />

      <DeleteUserDialog
        utente={deleteUser}
        loading={users.saving}
        onClose={() => setDeleteUser(null)}
        onConfirm={users.eliminaUtente}
      />
    </CrudPage>
  )
}