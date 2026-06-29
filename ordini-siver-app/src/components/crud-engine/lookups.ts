export type CrudLookupConfig = {
  endpoint: string
  responseKey: string
  labelKey: string
  valueKey: string
}

export const CRUD_LOOKUPS: Record<string, CrudLookupConfig> = {
  categories: {
    endpoint: "/api/admin/categories",
    responseKey: "categories",
    labelKey: "name",
    valueKey: "id",
  },

  units: {
    endpoint: "/api/admin/units",
    responseKey: "units",
    labelKey: "code",
    valueKey: "id",
  },
}