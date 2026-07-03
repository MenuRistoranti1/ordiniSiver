export type CrudRepository<T, Form> = {
  load: () => Promise<T[]>
  create: (form: Form) => Promise<unknown>
  update: (id: string, form: Form) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
}

export type CrudState<T> = {
  items: T[]
  filteredItems: T[]
  loading: boolean
  saving: boolean
  message: string
  error: string
  search: string
  setSearch: (value: string) => void
  load: () => Promise<void>
  create: (form: any) => Promise<boolean>
  update: (id: string, form: any) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
}