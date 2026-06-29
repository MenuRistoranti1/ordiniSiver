"use client"

import { useEffect, useState } from "react"
import CrudFormModal from "@/components/crud/CrudFormModal"
import type { Product, ProductForm } from "../types"

type Props = {
  open: boolean
  product?: Product | null
  loading: boolean
  onClose: () => void
  onSave: (form: ProductForm) => Promise<boolean>
}

const initialForm: ProductForm = {
  name: "",
  supplier_code: "",
  internal_code: "",
  barcode: "",
  category: "",
  unit: "",
  price: "",
  vat: "10",
  min_stock: "0",
  max_stock: "0",
  required_stock: false,
  active: true,
  image_url: "",
  notes: "",
}

export default function ProductFormModal({
  open,
  product,
  loading,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ProductForm>(initialForm)

  useEffect(() => {
    if (!open) return

    if (!product) {
      setForm(initialForm)
      return
    }

    setForm({
      name: product.name || "",
      supplier_code: product.supplier_code || "",
      internal_code: product.internal_code || "",
      barcode: product.barcode || "",
      category: product.category || "",
      unit: product.unit || "",
      price: product.price?.toString() || "",
      vat: product.vat?.toString() || "10",
      min_stock: product.min_stock?.toString() || "0",
      max_stock: product.max_stock?.toString() || "0",
      required_stock: Boolean(product.required_stock),
      active: Boolean(product.active),
      image_url: product.image_url || "",
      notes: product.notes || "",
    })
  }, [open, product])

  async function salva() {
    const ok = await onSave(form)

    if (ok) {
      onClose()
    }
  }

  return (
    <CrudFormModal
      open={open}
      title={product ? "Modifica prodotto" : "Nuovo prodotto"}
      loading={loading}
      submitLabel={product ? "Salva modifiche" : "Crea prodotto"}
      onClose={onClose}
      onSubmit={salva}
    >
      <div className="grid grid-cols-1 gap-4">

        <input
          placeholder="Nome prodotto"
          value={form.name}
          onChange={(e)=>setForm({...form,name:e.target.value})}
          className="rounded-xl border border-slate-300 px-4 py-3"
        />

        <div className="grid grid-cols-2 gap-4">

          <input
            placeholder="Codice fornitore"
            value={form.supplier_code}
            onChange={(e)=>setForm({...form,supplier_code:e.target.value})}
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <input
            placeholder="Codice interno"
            value={form.internal_code}
            onChange={(e)=>setForm({...form,internal_code:e.target.value})}
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

        </div>

        <input
          placeholder="Barcode"
          value={form.barcode}
          onChange={(e)=>setForm({...form,barcode:e.target.value})}
          className="rounded-xl border border-slate-300 px-4 py-3"
        />

        <div className="grid grid-cols-2 gap-4">

          <input
            placeholder="Categoria"
            value={form.category}
            onChange={(e)=>setForm({...form,category:e.target.value})}
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <input
            placeholder="Unità di misura"
            value={form.unit}
            onChange={(e)=>setForm({...form,unit:e.target.value})}
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

        </div>

        <div className="grid grid-cols-4 gap-4">

          <input
            placeholder="Prezzo"
            value={form.price}
            onChange={(e)=>setForm({...form,price:e.target.value})}
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <input
            placeholder="IVA"
            value={form.vat}
            onChange={(e)=>setForm({...form,vat:e.target.value})}
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <input
            placeholder="Scorta Min"
            value={form.min_stock}
            onChange={(e)=>setForm({...form,min_stock:e.target.value})}
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <input
            placeholder="Scorta Max"
            value={form.max_stock}
            onChange={(e)=>setForm({...form,max_stock:e.target.value})}
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

        </div>

        <label className="flex items-center gap-3">

          <input
            type="checkbox"
            checked={form.active}
            onChange={(e)=>setForm({...form,active:e.target.checked})}
          />

          <span className="font-bold">
            Prodotto attivo
          </span>

        </label>

      </div>
    </CrudFormModal>
  )
}