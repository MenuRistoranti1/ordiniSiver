import type { CrudModuleConfig } from "@/components/crud-engine"

export type DefinedModule<T> = {
  key: string
  useHook: () => any
  getConfig: (stats: any) => CrudModuleConfig<T>
  mapCreate: (values: Record<string, any>) => any
  mapUpdate: (values: Record<string, any>) => any
}

export function defineModule<T>(module: DefinedModule<T>) {
  return module
}