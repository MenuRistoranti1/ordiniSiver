"use client"

import { useEffect } from "react"
import { CrudModule } from "@/components/crud-engine"
import { useProducts } from "@/modules/products/hooks"
import { getProductsConfig } from "@/modules/products/config"

export default function AdminProductsV2Page() {
  const products = useProducts()

  useEffect(() => {
    products.caricaProdotti()
  }, [])

  const config = getProductsConfig(products.statistiche)

  return (
    <CrudModule
      config={config}
      data={products.productsFiltrati}
      loading={products.loading}
      saving={products.saving}
      searchValue={products.ricerca}
      onSearchChange={products.setRicerca}
      message={products.messaggio}
      error={products.errore}
      onCreate={(values) =>
        products.creaProdotto({
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
        })
      }
      onUpdate={(id, values) =>
        products.aggiornaProdotto(id, {
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
        })
      }
      onDelete={products.eliminaProdotto}
    />
  )
}