import { defineModule } from "./defineModule"
import { useCategories } from "./categories/hooks"
import { getCategoriesConfig } from "./categories/config"
import { useUnits } from "./units/hooks"
import { getUnitsConfig } from "./units/config"
import { useProducts } from "./products/hooks"
import { getProductsConfig } from "./products/config"

export const modules = {
  categories: defineModule({
    key: "categories",
    useHook: useCategories,
    getConfig: getCategoriesConfig,
    mapCreate: (values) => ({
      name: String(values.name || ""),
      active: Boolean(values.active),
    }),
    mapUpdate: (values) => ({
      name: String(values.name || ""),
      active: Boolean(values.active),
    }),
  }),

  units: defineModule({
    key: "units",
    useHook: useUnits,
    getConfig: getUnitsConfig,
    mapCreate: (values) => ({
      code: String(values.code || ""),
      description: String(values.description || ""),
      active: Boolean(values.active),
    }),
    mapUpdate: (values) => ({
      code: String(values.code || ""),
      description: String(values.description || ""),
      active: Boolean(values.active),
    }),
  }),

  products: defineModule({
    key: "products",
    useHook: useProducts,
    getConfig: getProductsConfig,
    mapCreate: (values) => ({
      name: String(values.name || ""),
      supplier_code: String(values.supplier_code || ""),
      internal_code: String(values.internal_code || ""),
      barcode: "",
      category: "",
      unit: "",
      category_id: String(values.category_id || ""),
      unit_id: String(values.unit_id || ""),
      price: String(values.price || ""),
      vat: String(values.vat || ""),
      min_stock: "",
      max_stock: "",
      required_stock: false,
      active: Boolean(values.active),
      image_url: "",
      notes: String(values.notes || ""),
    }),
    mapUpdate: (values) => ({
      name: String(values.name || ""),
      supplier_code: String(values.supplier_code || ""),
      internal_code: String(values.internal_code || ""),
      barcode: String(values.barcode || ""),
      category: "",
      unit: "",
      category_id: String(values.category_id || ""),
      unit_id: String(values.unit_id || ""),
      price: String(values.price || ""),
      vat: String(values.vat || ""),
      min_stock: String(values.min_stock || ""),
      max_stock: String(values.max_stock || ""),
      required_stock: Boolean(values.required_stock),
      active: Boolean(values.active),
      image_url: String(values.image_url || ""),
      notes: String(values.notes || ""),
    }),
  }),
}

export type ModuleKey = keyof typeof modules