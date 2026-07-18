"use client"

import { useState, useEffect, useMemo, useCallback, type Dispatch, type SetStateAction } from "react"
import { authentication } from "@/app/actions/authentication"
import { can } from "@/lib/permissions"
import { toast } from "@/hooks/use-toast"
import VentanaPopup from "./VentanaPopup"
import SearchableSelect from "./SearchableSelect"
import {
  Package, PackagePlus, Search, Boxes, AlertTriangle, Banknote, ShoppingCart,
  Pencil, Trash2, X, Check, Plus, Minus, Stethoscope, Layers, FlaskConical,
} from "lucide-react"

/* ─────────────────────────────────────────────────────────────────────────
   Inventario de la clínica.

   El catálogo normativo vive en `materials` (clave + descripción + nombre por
   material_names y especialidad por material_groups). "Agregar al inventario"
   crea un registro en `inventory_items` (unidad, costo, precio, stock…) y lo
   enlaza vía materials.inventory_item_id. Opcionalmente el material puede
   asociarse a un tratamiento (material_names.treatment_id).
   ───────────────────────────────────────────────────────────────────────── */

type MaterialName = { id: number; nombre: string; treatment_id: number | null }

type CatalogMaterial = {
  id: number
  clave: string
  descripcion: string | null
  inventory_item_id: number | null
  material_name: MaterialName | null
  grupo: string | null
}

type ItemData = {
  id: number
  unidad_medica: string
  costo: number | null
  precio: number | null
  stock: number
  se_vende: boolean
  activo: boolean
}

type InventoryEntry = {
  material_id: number
  clave: string
  descripcion: string | null
  material_name: MaterialName | null
  grupo: string | null
  tratamiento: string | null
  item: ItemData
}

type Treatment = { id: number; nombre: string }

// Debajo de este stock (sin llegar a 0) el material se marca como "stock bajo".
const LOW_STOCK = 5

// Unidades de medida frecuentes; el campo además acepta texto libre.
const UNIDADES = [
  "Pieza", "Caja", "Frasco", "Envase", "Paquete", "Bote", "Tubo", "Sobre",
  "Jeringa", "Kit", "Par", "Rollo", "ml", "mg", "g", "L",
]

const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const labelClass =
  "block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide"

const inputClass =
  "w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-slate-600 " +
  "bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 " +
  "placeholder:text-gray-400 dark:placeholder:text-slate-500 " +
  "focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors " +
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

// Formulario compartido entre "agregar" y "editar".
type ItemForm = {
  unidad_medica: string
  costo: string
  precio: string
  stock: string
  se_vende: boolean
  activo: boolean
  treatment_id: string // "" = sin asignar
}

const emptyForm: ItemForm = {
  unidad_medica: "",
  costo: "",
  precio: "",
  stock: "0",
  se_vende: false,
  activo: true,
  treatment_id: "",
}

export default function Inventario() {
  const [canAccess, setCanAccess] = useState<boolean | null>(null)

  // Inventario actual
  const [entries, setEntries] = useState<InventoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"todos" | "bajo" | "venta" | "inactivos">("todos")

  // Catálogo (carga diferida al abrir la ventana de agregar)
  const [catalog, setCatalog] = useState<CatalogMaterial[]>([])
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogGroup, setCatalogGroup] = useState("")
  // Filtro por nombre (material_names); "todos" = mostrar todos.
  const [catalogName, setCatalogName] = useState("todos")

  // Tratamientos (carga diferida al abrir su selector)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [treatmentsLoaded, setTreatmentsLoaded] = useState(false)
  const [treatmentsLoading, setTreatmentsLoading] = useState(false)

  // Ventana de agregar: paso 1 (elegir del catálogo) → paso 2 (datos del item)
  const [addOpen, setAddOpen] = useState(false)
  const [addStep, setAddStep] = useState<1 | 2>(1)
  const [selectedMaterial, setSelectedMaterial] = useState<CatalogMaterial | null>(null)

  // Ventana de edición (reutiliza el mismo formulario)
  const [editing, setEditing] = useState<InventoryEntry | null>(null)

  const [form, setForm] = useState<ItemForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Confirmación inline para quitar un material (id del inventory_item)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const loadInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory")
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`)
      setEntries(data.items ?? [])
    } catch (e) {
      toast({
        title: "No se pudo cargar el inventario",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const session = await authentication()
      if (!can(session?.user?.role, "inventario")) { setCanAccess(false); return }
      setCanAccess(true)
      loadInventory()
    }
    init()
  }, [loadInventory])

  const loadCatalog = () => {
    if (catalogLoaded || catalogLoading) return
    setCatalogLoading(true)
    fetch("/api/inventory/catalog")
      .then(r => r.json())
      .then(d => { setCatalog(d.materials ?? []); setCatalogLoaded(true) })
      .catch(console.error)
      .finally(() => setCatalogLoading(false))
  }

  const loadTreatments = () => {
    if (treatmentsLoaded || treatmentsLoading) return
    setTreatmentsLoading(true)
    fetch("/api/dental-treatments")
      .then(r => r.json())
      .then(d => { setTreatments(d.treatments ?? []); setTreatmentsLoaded(true) })
      .catch(console.error)
      .finally(() => setTreatmentsLoading(false))
  }

  const treatmentOpts = useMemo(
    () => [
      { value: "", label: "Sin asignar" },
      ...treatments.map(t => ({ value: String(t.id), label: t.nombre })),
    ],
    [treatments],
  )

  const unidadOpts = useMemo(() => UNIDADES.map(u => ({ value: u, label: u })), [])

  /* ── Estadísticas ── */
  const stats = useMemo(() => {
    const activos = entries.filter(e => e.item.activo)
    return {
      total: entries.length,
      bajo: activos.filter(e => e.item.stock <= LOW_STOCK).length,
      valor: activos.reduce((sum, e) => sum + (Number(e.item.costo) || 0) * (e.item.stock || 0), 0),
      venta: activos.filter(e => e.item.se_vende).length,
    }
  }, [entries])

  /* ── Filtros de la lista ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      if (filter === "bajo" && !(e.item.activo && e.item.stock <= LOW_STOCK)) return false
      if (filter === "venta" && !(e.item.activo && e.item.se_vende)) return false
      if (filter === "inactivos" && e.item.activo) return false
      if (!q) return true
      return `${e.material_name?.nombre ?? ""} ${e.clave} ${e.descripcion ?? ""} ${e.grupo ?? ""} ${e.tratamiento ?? ""}`
        .toLowerCase()
        .includes(q)
    })
  }, [entries, search, filter])

  /* ── Catálogo filtrado (ventana de agregar) ── */
  const catalogGroups = useMemo(
    () => Array.from(new Set(catalog.map(m => m.grupo).filter(Boolean))) as string[],
    [catalog],
  )

  // Nombres del catálogo (material_names) para el filtro del paso 1. "Todos"
  // (opción por defecto) muestra todos los materiales listados abajo.
  const catalogNameOpts = useMemo(() => {
    const seen = new Map<number, string>()
    catalog.forEach(m => {
      if (m.material_name) seen.set(m.material_name.id, m.material_name.nombre)
    })
    return [
      { value: "todos", label: "Todos" },
      ...Array.from(seen, ([id, nombre]) => ({ value: String(id), label: nombre }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    ]
  }, [catalog])

  const catalogFiltered = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase()
    return catalog.filter(m => {
      if (catalogGroup && m.grupo !== catalogGroup) return false
      if (catalogName && catalogName !== "todos" && String(m.material_name?.id ?? "") !== catalogName) return false
      if (!q) return true
      return `${m.material_name?.nombre ?? ""} ${m.clave} ${m.descripcion ?? ""}`.toLowerCase().includes(q)
    })
  }, [catalog, catalogSearch, catalogGroup, catalogName])

  /* ── Acciones ── */

  const openAdd = () => {
    setAddStep(1)
    setSelectedMaterial(null)
    setCatalogSearch("")
    setCatalogGroup("")
    setCatalogName("todos")
    setForm(emptyForm)
    setAddOpen(true)
    loadCatalog()
  }

  const pickMaterial = (m: CatalogMaterial) => {
    if (m.inventory_item_id) return
    setSelectedMaterial(m)
    setForm({
      ...emptyForm,
      treatment_id: m.material_name?.treatment_id ? String(m.material_name.treatment_id) : "",
    })
    // El tratamiento actual podría no estar cargado aún: se cargan para mostrar su nombre.
    if (m.material_name?.treatment_id) loadTreatments()
    setAddStep(2)
  }

  const handleAdd = async () => {
    if (!selectedMaterial || !form.unidad_medica.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_id: selectedMaterial.id,
          unidad_medica: form.unidad_medica.trim(),
          costo: form.costo,
          precio: form.precio,
          stock: form.stock,
          se_vende: form.se_vende,
          treatment_id: form.treatment_id ? Number(form.treatment_id) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`)

      toast({ title: "Material agregado al inventario" })
      // El material queda marcado en el catálogo para no agregarlo dos veces.
      setCatalog(prev => prev.map(m =>
        m.id === selectedMaterial.id ? { ...m, inventory_item_id: data.item.id } : m
      ))
      setAddOpen(false)
      loadInventory()
    } catch (e) {
      toast({
        title: "No se pudo agregar el material",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (entry: InventoryEntry) => {
    setForm({
      unidad_medica: entry.item.unidad_medica ?? "",
      costo: entry.item.costo == null ? "" : String(entry.item.costo),
      precio: entry.item.precio == null ? "" : String(entry.item.precio),
      stock: String(entry.item.stock ?? 0),
      se_vende: entry.item.se_vende,
      activo: entry.item.activo,
      treatment_id: entry.material_name?.treatment_id ? String(entry.material_name.treatment_id) : "",
    })
    if (entry.material_name?.treatment_id) loadTreatments()
    setEditing(entry)
  }

  const handleEdit = async () => {
    if (!editing || !form.unidad_medica.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/${editing.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidad_medica: form.unidad_medica.trim(),
          costo: form.costo,
          precio: form.precio,
          stock: form.stock,
          se_vende: form.se_vende,
          activo: form.activo,
          material_name_id: editing.material_name?.id ?? null,
          treatment_id: form.treatment_id ? Number(form.treatment_id) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`)

      toast({ title: "Material actualizado" })
      setEditing(null)
      loadInventory()
    } catch (e) {
      toast({
        title: "No se pudo actualizar",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Ajuste rápido de stock desde la lista (optimista, con reversión si falla).
  const adjustStock = async (entry: InventoryEntry, delta: number) => {
    const newStock = Math.max(0, (entry.item.stock || 0) + delta)
    if (newStock === entry.item.stock) return
    const prev = entries
    setEntries(es => es.map(e =>
      e.item.id === entry.item.id ? { ...e, item: { ...e.item, stock: newStock } } : e
    ))
    try {
      const res = await fetch(`/api/inventory/${entry.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setEntries(prev)
      toast({ title: "No se pudo actualizar el stock", variant: "destructive" })
    }
  }

  const handleDelete = async (entry: InventoryEntry) => {
    setConfirmDelete(null)
    const prev = entries
    setEntries(es => es.filter(e => e.item.id !== entry.item.id))
    try {
      const res = await fetch(`/api/inventory/${entry.item.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `Error ${res.status}`)
      }
      toast({ title: "Material quitado del inventario" })
      setCatalog(c => c.map(m =>
        m.id === entry.material_id ? { ...m, inventory_item_id: null } : m
      ))
    } catch (e) {
      setEntries(prev)
      toast({
        title: "No se pudo quitar el material",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    }
  }

  /* ── Render ── */

  if (canAccess === null)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  if (!canAccess)
    return <p className="p-4 text-gray-500 dark:text-slate-400">No tienes permiso para acceder a esta página.</p>

  const stockBadge = (item: ItemData) => {
    if (!item.activo)
      return "bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500"
    if (item.stock === 0)
      return "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
    if (item.stock <= LOW_STOCK)
      return "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
  }

  const filterChips: { key: typeof filter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "bajo", label: "Stock bajo" },
    { key: "venta", label: "Se vende" },
    { key: "inactivos", label: "Inactivos" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">

      {/* ══════════ Encabezado ══════════ */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 leading-tight">Inventario</h1>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Materiales de apoyo de la clínica
                </p>
              </div>
            </div>

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                         bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                         rounded-xl shadow-sm transition-all"
            >
              <PackagePlus className="w-4 h-4" />
              Agregar material
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* ══════════ Tarjetas de resumen ══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              icon: Boxes, label: "Materiales", value: String(stats.total),
              tint: "text-sky-500 bg-sky-50 dark:bg-sky-900/30",
            },
            {
              icon: AlertTriangle, label: "Stock bajo", value: String(stats.bajo),
              tint: stats.bajo > 0
                ? "text-amber-500 bg-amber-50 dark:bg-amber-900/30"
                : "text-gray-300 bg-gray-50 dark:text-slate-600 dark:bg-slate-700/50",
            },
            {
              icon: Banknote, label: "Valor del inventario", value: money(stats.valor),
              tint: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30",
            },
            {
              icon: ShoppingCart, label: "En venta", value: String(stats.venta),
              tint: "text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30",
            },
          ].map(({ icon: Icon, label, value, tint }) => (
            <div
              key={label}
              className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm px-4 py-3.5"
            >
              <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${tint}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-800 dark:text-slate-100 leading-tight tabular-nums truncate">
                  {value}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ══════════ Búsqueda + filtros ══════════ */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, clave, descripción o tratamiento…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                         bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                         placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {filterChips.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`shrink-0 px-3 h-9 text-xs font-medium rounded-xl border transition-colors ${
                  filter === key
                    ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                    : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════ Lista del inventario ══════════ */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 py-16 text-center">
            <FlaskConical className="w-10 h-10 text-gray-200 dark:text-slate-700" />
            {entries.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                    Tu inventario está vacío
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500 max-w-xs">
                    Busca materiales del catálogo y asígnalos a tu inventario para llevar el control de tu stock.
                  </p>
                </div>
                <button
                  onClick={openAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-sky-600 dark:text-sky-400
                             bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800
                             rounded-xl shadow-sm hover:bg-sky-50 dark:hover:bg-slate-700 transition-all"
                >
                  <PackagePlus className="w-4 h-4" />
                  Agregar tu primer material
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-slate-500">
                {search ? `Sin resultados para "${search}"` : "Sin materiales con este filtro"}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm divide-y divide-gray-50 dark:divide-slate-700 overflow-hidden">
            {filtered.map(entry => {
              const { item } = entry
              return (
                <div
                  key={item.id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-sky-50/40 dark:hover:bg-slate-700/40 ${
                    !item.activo ? "opacity-60" : ""
                  }`}
                >
                  {/* Nombre + detalles */}
                  <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400/15 to-cyan-400/15 dark:from-sky-500/20 dark:to-cyan-500/20 grid place-items-center shrink-0">
                      <Package className="w-4 h-4 text-sky-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">
                          {entry.material_name?.nombre ?? "Material"}
                        </p>
                        <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 rounded px-1.5 py-0.5">
                          {entry.clave}
                        </span>
                        {!item.activo && (
                          <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-600 rounded-full px-2 py-0.5">
                            Inactivo
                          </span>
                        )}
                        {item.se_vende && item.activo && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 rounded-full px-2 py-0.5">
                            <ShoppingCart className="w-2.5 h-2.5" />
                            Se vende
                          </span>
                        )}
                        {entry.tratamiento && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/30 rounded-full px-2 py-0.5"
                            title="Tratamiento donde se usa este material"
                          >
                            <Stethoscope className="w-2.5 h-2.5" />
                            {entry.tratamiento}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-xl">
                        {entry.descripcion}
                      </p>
                    </div>
                  </div>

                  {/* Costo / precio */}
                  <div className="hidden md:flex flex-col items-end w-24 shrink-0">
                    <span className="text-xs text-gray-400 dark:text-slate-500">Costo</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-200 tabular-nums">
                      {money(item.costo)}
                    </span>
                  </div>
                  <div className="hidden md:flex flex-col items-end w-24 shrink-0">
                    <span className="text-xs text-gray-400 dark:text-slate-500">Precio</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-200 tabular-nums">
                      {item.se_vende ? money(item.precio) : "—"}
                    </span>
                  </div>

                  {/* Stock con ajuste rápido */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700">
                      <button
                        type="button"
                        onClick={() => adjustStock(entry, -1)}
                        disabled={item.stock <= 0}
                        title="Restar 1 al stock"
                        className="grid h-8 w-7 place-items-center text-gray-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 disabled:opacity-30"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span
                        className={`grid h-8 min-w-[52px] place-items-center border-x border-gray-200 dark:border-slate-600 px-1.5 text-xs font-bold tabular-nums rounded-none ${stockBadge(item)}`}
                        title={`${item.stock} ${item.unidad_medica}`}
                      >
                        {item.stock}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustStock(entry, +1)}
                        title="Sumar 1 al stock"
                        className="grid h-8 w-7 place-items-center text-gray-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="w-14 text-xs text-gray-400 dark:text-slate-500 truncate" title={item.unidad_medica}>
                      {item.unidad_medica}
                    </span>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    {confirmDelete === item.id ? (
                      <div className="flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 px-2 py-1">
                        <span className="text-[11px] font-medium text-red-600 dark:text-red-400">¿Quitar?</span>
                        <button
                          onClick={() => handleDelete(entry)}
                          title="Confirmar"
                          className="rounded p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          title="Cancelar"
                          className="rounded p-1 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => openEdit(entry)}
                          title="Editar material"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-sky-50 hover:text-sky-600
                                     dark:hover:bg-sky-900/30 dark:hover:text-sky-400 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item.id)}
                          title="Quitar del inventario"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500
                                     dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && entries.length > 0 && (
          <p className="text-center text-[11px] text-gray-400 dark:text-slate-500">
            {filtered.length} de {entries.length} {entries.length === 1 ? "material" : "materiales"} en el inventario
          </p>
        )}
      </div>

      {/* ══════════ Ventana: agregar material del catálogo ══════════ */}
      <VentanaPopup
        open={addOpen}
        onOpenChange={setAddOpen}
        title={addStep === 1 ? "Agregar material al inventario" : (selectedMaterial?.material_name?.nombre ?? "Nuevo material")}
        subtitle={
          addStep === 1
            ? "Busca en el catálogo de materiales de apoyo"
            : `Clave ${selectedMaterial?.clave ?? ""} · define los datos para tu inventario`
        }
        icon={addStep === 1 ? Search : PackagePlus}
        onBack={addStep === 2 ? () => setAddStep(1) : undefined}
        backTitle="Volver al catálogo"
        contentClassName="sm:max-w-2xl"
        bodyClassName="flex flex-col"
        onContinue={addStep === 2 ? handleAdd : undefined}
        continueLabel={
          <>
            <PackagePlus className="w-4 h-4" />
            Agregar al inventario
          </>
        }
        continueDisabled={!form.unidad_medica.trim()}
        continueLoading={saving}
      >
        {addStep === 1 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {/* Buscador del catálogo */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar por nombre, clave o descripción…"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-4 h-10 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                           bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                           placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
              />
            </div>

            {/* Filtro por nombre de material (material_names). "Otro" lista todos. */}
            <div className="shrink-0">
              <SearchableSelect
                options={catalogNameOpts}
                value={catalogName}
                onChange={setCatalogName}
                loading={catalogLoading}
                placeholder="Filtrar por nombre de material…"
                emptyText="Sin nombres que coincidan"
                direction="down"
              />
            </div>

            {/* Filtro por especialidad */}
            {catalogGroups.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
                <Layers className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
                <button
                  onClick={() => setCatalogGroup("")}
                  className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                    catalogGroup === ""
                      ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                      : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  Todas
                </button>
                {catalogGroups.map(g => (
                  <button
                    key={g}
                    onClick={() => setCatalogGroup(g === catalogGroup ? "" : g)}
                    title={g}
                    className={`shrink-0 max-w-[220px] truncate px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                      catalogGroup === g
                        ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                        : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            {/* Resultados */}
            <div className="min-h-[260px] flex-1 overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700">
              {catalogLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : catalogFiltered.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-400 dark:text-slate-500">
                  {catalogLoaded ? "Sin materiales que coincidan con tu búsqueda" : "Cargando catálogo…"}
                </p>
              ) : (
                catalogFiltered.map(m => {
                  const added = !!m.inventory_item_id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => pickMaterial(m)}
                      disabled={added}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors group ${
                        added
                          ? "cursor-default bg-gray-50/60 dark:bg-slate-700/30"
                          : "hover:bg-sky-50/60 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className={`text-sm font-medium truncate ${
                            added
                              ? "text-gray-400 dark:text-slate-500"
                              : "text-gray-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400"
                          }`}>
                            {m.material_name?.nombre ?? "Material"}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 rounded px-1.5 py-0.5">
                            {m.clave}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-slate-500 line-clamp-1">
                          {m.descripcion}
                        </p>
                      </div>
                      {added ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-2 py-0.5">
                          <Check className="w-3 h-3" />
                          En inventario
                        </span>
                      ) : (
                        <Plus className="w-4 h-4 shrink-0 text-gray-300 dark:text-slate-600 group-hover:text-sky-500 transition-colors" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          selectedMaterial && (
            <div className="space-y-5">
              {/* Resumen del material elegido */}
              <div className="rounded-xl border border-sky-100 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-900/20 px-4 py-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                  {selectedMaterial.material_name?.nombre}
                  <span className="ml-2 text-[10px] font-mono font-normal text-gray-400 dark:text-slate-500">
                    {selectedMaterial.clave}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400 line-clamp-2">
                  {selectedMaterial.descripcion}
                </p>
                {selectedMaterial.grupo && (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                    <Layers className="w-3 h-3" />
                    {selectedMaterial.grupo}
                  </span>
                )}
              </div>

              <ItemFormFields
                form={form}
                setForm={setForm}
                unidadOpts={unidadOpts}
                treatmentOpts={treatmentOpts}
                treatmentsLoading={treatmentsLoading}
                loadTreatments={loadTreatments}
                showActivo={false}
              />
            </div>
          )
        )}
      </VentanaPopup>

      {/* ══════════ Ventana: editar material del inventario ══════════ */}
      <VentanaPopup
        open={!!editing}
        onOpenChange={o => { if (!o) setEditing(null) }}
        title={editing?.material_name?.nombre ?? "Editar material"}
        subtitle={editing ? `Clave ${editing.clave} · edita los datos de tu inventario` : undefined}
        icon={Pencil}
        contentClassName="sm:max-w-xl"
        onContinue={handleEdit}
        continueLabel={
          <>
            <Check className="w-4 h-4" />
            Guardar cambios
          </>
        }
        continueDisabled={!form.unidad_medica.trim()}
        continueLoading={saving}
      >
        {editing && (
          <ItemFormFields
            form={form}
            setForm={setForm}
            unidadOpts={unidadOpts}
            treatmentOpts={treatmentOpts}
            treatmentsLoading={treatmentsLoading}
            loadTreatments={loadTreatments}
            showActivo
            currentTreatmentLabel={editing.tratamiento ?? undefined}
          />
        )}
      </VentanaPopup>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Campos del formulario del item (compartidos entre agregar y editar).
   ───────────────────────────────────────────────────────────────────────── */
function ItemFormFields({
  form,
  setForm,
  unidadOpts,
  treatmentOpts,
  treatmentsLoading,
  loadTreatments,
  showActivo,
  currentTreatmentLabel,
}: {
  form: ItemForm
  setForm: Dispatch<SetStateAction<ItemForm>>
  unidadOpts: { value: string; label: string }[]
  treatmentOpts: { value: string; label: string }[]
  treatmentsLoading: boolean
  loadTreatments: () => void
  showActivo: boolean
  currentTreatmentLabel?: string
}) {
  const set = (patch: Partial<ItemForm>) => setForm(f => ({ ...f, ...patch }))

  return (
    <div className="space-y-5">
      {/* Unidad + stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Unidad de medida *</label>
          <SearchableSelect
            options={unidadOpts}
            value={form.unidad_medica}
            onChange={v => set({ unidad_medica: v })}
            placeholder="Pieza, caja, frasco, ml…"
            creatable
            createLabel={q => <>Usar «{q}» como unidad</>}
            direction="down"
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>{showActivo ? "Stock" : "Stock inicial"}</label>
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 w-fit">
            <button
              type="button"
              onClick={() => set({ stock: String(Math.max(0, (parseInt(form.stock, 10) || 0) - 1)) })}
              className="grid h-9 w-9 place-items-center text-gray-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={e => set({ stock: e.target.value })}
              onBlur={() => set({ stock: String(Math.max(0, parseInt(form.stock, 10) || 0)) })}
              className="h-9 w-16 border-x border-gray-200 dark:border-slate-600 bg-transparent text-center text-sm tabular-nums
                         text-gray-800 dark:text-slate-100 focus:outline-none
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => set({ stock: String((parseInt(form.stock, 10) || 0) + 1) })}
              className="grid h-9 w-9 place-items-center text-gray-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Costo + venta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Costo para la clínica</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.costo}
              onChange={e => set({ costo: e.target.value })}
              placeholder="0.00"
              className={`${inputClass} pl-6 tabular-nums`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>¿Se vende al paciente?</label>
          <div className="flex gap-2">
            {[{ v: true, label: "Sí" }, { v: false, label: "No" }].map(opt => {
              const active = form.se_vende === opt.v
              return (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => set({ se_vende: opt.v })}
                  className={`inline-flex items-center gap-1.5 px-3.5 h-9 text-sm font-medium rounded-lg border transition-colors ${
                    active
                      ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                      : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Precio de venta (solo si se vende) */}
      {form.se_vende && (
        <div className="space-y-1.5 sm:max-w-[calc(50%-0.5rem)]">
          <label className={labelClass}>Precio de venta al público</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.precio}
              onChange={e => set({ precio: e.target.value })}
              placeholder="0.00"
              className={`${inputClass} pl-6 tabular-nums`}
            />
          </div>
        </div>
      )}

      {/* Tratamiento (opcional) */}
      <div className="space-y-1.5">
        <label className={labelClass}>
          <span className="inline-flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-sky-500" />
            Tratamiento donde se usa
            <span className="normal-case font-normal text-gray-400 dark:text-slate-500">(opcional)</span>
          </span>
        </label>
        <SearchableSelect
          options={treatmentOpts}
          value={form.treatment_id}
          onChange={v => set({ treatment_id: v })}
          onOpen={loadTreatments}
          loading={treatmentsLoading}
          placeholder="Sin asignar"
          displayLabel={currentTreatmentLabel}
          direction="up"
        />
        <p className="text-[11px] text-gray-400 dark:text-slate-500">
          Indica que este material se usa en ese tratamiento en específico.
        </p>
      </div>

      {/* Activo (solo al editar) */}
      {showActivo && (
        <div className="space-y-1.5">
          <label className={labelClass}>¿Disponible en el inventario?</label>
          <div className="flex gap-2">
            {[{ v: true, label: "Activo" }, { v: false, label: "Inactivo" }].map(opt => {
              const active = form.activo === opt.v
              return (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => set({ activo: opt.v })}
                  className={`inline-flex items-center gap-1.5 px-3.5 h-9 text-sm font-medium rounded-lg border transition-colors ${
                    active
                      ? opt.v
                        ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : "border-gray-300 dark:border-slate-500 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200"
                      : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
