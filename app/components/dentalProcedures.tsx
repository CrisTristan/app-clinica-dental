'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Stethoscope, Pencil, Trash2, Check, Loader2, Plus, Filter as FilterIcon, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import VentanaPopup from './VentanaPopup'
import SearchableSelect, { type Option } from './SearchableSelect'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type Filter = 'clinicos' | 'normativos'

type Procedure = {
  key: string
  nombre: string
  // Sólo procedimientos clínicos (clinic_procedures):
  id?: number
  precio?: number | null
  descripcion?: string | null
  duracion_estimada?: string | null
  procedure_category_id?: number | null
  // Sólo procedimientos normativos (dental_procedures):
  catalog_key?: string
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'clinicos',   label: 'Clínicos'   },
  { id: 'normativos', label: 'Normativos' },
]

// Normaliza para buscar sin acentos ni mayúsculas.
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

// Precio actual formateado como moneda (MXN); vacío/nulo → "Sin precio".
const fmtPrice = (precio?: number | null) =>
  precio == null || precio === 0
    ? 'Sin precio'
    : Number(precio).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

/* ── Card de un procedimiento ── */
function ProcedureCard({
  proc, filter, onUpdated, onDeleted,
}: {
  proc: Procedure
  filter: Filter
  onUpdated: (updated: Procedure) => void
  onDeleted: (key: string) => void
}) {
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    precio: proc.precio != null ? String(proc.precio) : '',
    descripcion: proc.descripcion ?? '',
    duracion_estimada: proc.duracion_estimada ?? '',
  })

  const openEdit = () => {
    setForm({
      precio: proc.precio != null ? String(proc.precio) : '',
      descripcion: proc.descripcion ?? '',
      duracion_estimada: proc.duracion_estimada ?? '',
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clinic-procedures/${proc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precio: form.precio,
          descripcion: form.descripcion,
          duracion_estimada: form.duracion_estimada,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)

      onUpdated({ ...proc, ...data })
      setEditOpen(false)
      toast({ title: 'Procedimiento guardado', description: `Se actualizó "${proc.nombre}".` })
    } catch (err: any) {
      toast({ title: 'Error al guardar', description: err.message ?? 'Intenta de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/clinic-procedures/${proc.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      onDeleted(proc.key)
      toast({ title: 'Procedimiento eliminado', description: `Se eliminó "${proc.nombre}".` })
    } catch (err: any) {
      toast({ title: 'Error al eliminar', description: err.message ?? 'Intenta de nuevo.' })
    }
  }

  return (
    <div className="p-4 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-start gap-3">
        {filter !== 'clinicos' && (
          <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/30 grid place-items-center shrink-0">
            <Stethoscope className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{proc.nombre}</p>
          {filter === 'clinicos' && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              Precio actual: <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmtPrice(proc.precio)}</span>
            </p>
          )}
        </div>

        {/* Editar y borrar sólo en procedimientos clínicos */}
        {filter === 'clinicos' && (
          <div className="flex flex-col items-center gap-1 shrink-0">
            <button
              onClick={openEdit}
              title="Editar"
              className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 dark:text-slate-500
                         hover:bg-sky-50 dark:hover:bg-sky-900/30 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  title="Eliminar"
                  className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 dark:text-slate-500
                             hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar procedimiento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminará permanentemente <span className="font-semibold">&quot;{proc.nombre}&quot;</span> de
                    los procedimientos de la clínica. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  >
                    Continuar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Ventana emergente de edición */}
      <VentanaPopup
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Editar procedimiento"
        subtitle={<>Editando «{proc.nombre}»</>}
        icon={Pencil}
        contentClassName="sm:max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-slate-400">Precio (opcional)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.precio}
              onChange={e => setForm(prev => ({ ...prev, precio: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-slate-400">Descripción (opcional)</Label>
            <Input
              type="text"
              placeholder="Descripción del procedimiento"
              value={form.descripcion}
              onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-slate-400">Duración estimada</Label>
            <Input
              type="text"
              placeholder="ej. 30 minutes o 00:30:00"
              value={form.duracion_estimada}
              onChange={e => setForm(prev => ({ ...prev, duracion_estimada: e.target.value }))}
            />
          </div>
        </div>
      </VentanaPopup>
    </div>
  )
}

const EMPTY_ADD_FORM = {
  catalog_key: '',       // dental_procedures.catalog_key del procedimiento elegido
  nombre: '',            // nombre normativo del procedimiento elegido
  procedure_category_id: '',
  precio: '',
  descripcion: '',
  duracion_estimada: '',
}

export default function DentalProcedures() {
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>('clinicos')
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // ── Categorías (filtro por categoría + selector "tipo") ──
  const [categoryFilter, setCategoryFilter] = useState('')   // '' = todas
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(false)

  const loadCategories = () => {
    if (categoriesLoaded || categoriesLoading) return
    setCategoriesLoading(true)
    fetch('/api/procedure-categories')
      .then(r => r.json())
      .then(cat => {
        setCategoryOptions(
          (cat.categories ?? []).map((c: { id: number; nombre: string }) => ({
            value: String(c.id), label: c.nombre,
          })),
        )
        setCategoriesLoaded(true)
      })
      .catch(() => toast({ title: 'Error', description: 'No se pudieron cargar las categorías.' }))
      .finally(() => setCategoriesLoading(false))
  }

  // ── Ventana emergente "Agregar procedimiento clínico" ──
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM)
  const [catalogOptions, setCatalogOptions] = useState<Option[]>([])
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(false)

  // Carga perezosa del catálogo normativo al abrir la ventana de alta.
  const loadCatalog = () => {
    if (catalogLoaded || catalogLoading) return
    setCatalogLoading(true)
    fetch('/api/dental-procedures')
      .then(r => r.json())
      .then(proc => {
        setCatalogOptions(
          (proc.procedures ?? []).map((p: { catalog_key: string; nombre: string }) => ({
            value: String(p.catalog_key), label: p.nombre,
          })),
        )
        setCatalogLoaded(true)
      })
      .catch(() => toast({ title: 'Error', description: 'No se pudo cargar el catálogo normativo.' }))
      .finally(() => setCatalogLoading(false))
  }

  const openAdd = () => {
    setAddForm(EMPTY_ADD_FORM)
    setAddOpen(true)
    loadCatalog()
    loadCategories()
  }

  // ── Ventana emergente "Nueva categoría" ──
  const [catOpen, setCatOpen] = useState(false)
  const [catName, setCatName] = useState('')
  const [catSaving, setCatSaving] = useState(false)

  const openNewCategory = () => {
    setCatName('')
    setCatOpen(true)
  }

  const handleCreateCategory = async () => {
    const nombre = catName.trim()
    if (!nombre) return
    setCatSaving(true)
    try {
      const res = await fetch('/api/procedure-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)

      const opt: Option = { value: String(data.id), label: data.nombre }
      setCategoryOptions(prev => [...prev, opt].sort((a, b) => a.label.localeCompare(b.label)))
      setCategoriesLoaded(true)
      setCatOpen(false)
      setCatName('')
      toast({ title: 'Categoría creada', description: `Se creó "${data.nombre}".` })
    } catch (err: any) {
      toast({ title: 'Error al guardar', description: err.message ?? 'Intenta de nuevo.' })
    } finally {
      setCatSaving(false)
    }
  }

  const canSubmit = !!addForm.nombre.trim() && !!addForm.procedure_category_id

  const handleCreate = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const res = await fetch('/api/clinic-procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: addForm.nombre,
          dental_procedure_id: addForm.catalog_key,
          procedure_category_id: addForm.procedure_category_id,
          precio: addForm.precio,
          descripcion: addForm.descripcion,
          duracion_estimada: addForm.duracion_estimada,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)

      setAddOpen(false)
      toast({ title: 'Procedimiento agregado', description: `Se creó "${data.nombre}".` })

      const created: Procedure = {
        key: String(data.id),
        nombre: data.nombre,
        id: data.id,
        precio: data.precio,
        descripcion: data.descripcion,
        duracion_estimada: data.duracion_estimada,
        procedure_category_id: data.procedure_category_id ?? (Number(addForm.procedure_category_id) || null),
      }
      // Refleja el alta en la lista de clínicos (cambiando de filtro si hace falta).
      if (filter === 'clinicos') {
        setProcedures(prev =>
          [created, ...prev].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      } else {
        setFilter('clinicos')
      }
    } catch (err: any) {
      toast({ title: 'Error al guardar', description: err.message ?? 'Intenta de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    setCategoryFilter('')
    if (filter === 'clinicos') loadCategories()

    const endpoint = filter === 'clinicos' ? '/api/clinic-procedures' : '/api/dental-procedures'

    fetch(endpoint)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? `Error ${r.status}`)
        return data
      })
      .then((data: { procedures: any[] }) => {
        setProcedures(
          (data.procedures ?? []).map((p, i) => (
            filter === 'clinicos'
              ? {
                  key: String(p.id ?? i),
                  nombre: p.nombre,
                  id: p.id,
                  precio: p.precio,
                  descripcion: p.descripcion,
                  duracion_estimada: p.duracion_estimada,
                  procedure_category_id: p.procedure_category_id,
                }
              : {
                  key: String(p.catalog_key ?? i),
                  nombre: p.nombre,
                  catalog_key: p.catalog_key,
                }
          )),
        )
      })
      .catch(err => setError(err.message ?? 'No se pudieron cargar los procedimientos.'))
      .finally(() => setLoading(false))
  }, [filter])

  const filtered = useMemo(() => {
    const q = norm(searchTerm)
    return procedures.filter(p => {
      if (categoryFilter && String(p.procedure_category_id ?? '') !== categoryFilter) return false
      if (q && !norm(p.nombre).includes(q)) return false
      return true
    })
  }, [procedures, searchTerm, categoryFilter])

  const categoryFilterLabel = categoryFilter
    ? categoryOptions.find(o => o.value === categoryFilter)?.label ?? 'Categoría'
    : 'Todas las categorías'

  const handleUpdated = (updated: Procedure) =>
    setProcedures(prev => prev.map(p => p.key === updated.key ? updated : p))

  const handleDeleted = (key: string) =>
    setProcedures(prev => prev.filter(p => p.key !== key))

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm shrink-0">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Procedimientos</h1>
          {filter === 'clinicos' ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Catálogo de procedimientos dentales disponibles en la clínica.
              (procedimientos que ofrece la clínica, que pueden ser realizados por el personal clínico de la clínica)
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Catálogo de procedimientos dentales segun la el catalogo definido por el Centro Colaborador para la Familia de Clasificaciones Internacionales de la OMS en México (CEMECE).
            </p>
          )}
        </div>
      </div>

      {/* Filtro clínicos / normativos */}
      <div className="mt-6 inline-flex p-1 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
              ${filter === f.id
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Búsqueda + Agregar */}
      <div className="flex items-center gap-2 mt-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar procedimiento…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 h-9 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                       placeholder:text-gray-400 dark:placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
          />
        </div>

        {/* Filtro por categoría (sólo procedimientos clínicos) */}
        {filter === 'clinicos' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="Filtrar por categoría"
                aria-label="Filtrar por categoría"
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl text-sm font-medium
                           border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700
                           text-gray-700 dark:text-slate-200 hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
              >
                <FilterIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                <span className="hidden sm:inline max-w-[9rem] truncate">{categoryFilterLabel}</span>
                <ChevronDown className="hidden sm:inline w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto w-56">
              <DropdownMenuItem onClick={() => setCategoryFilter('')}>
                Todas las categorías
              </DropdownMenuItem>
              {categoriesLoading && (
                <DropdownMenuItem disabled>Cargando…</DropdownMenuItem>
              )}
              {categoryOptions.map(c => (
                <DropdownMenuItem key={c.value} onClick={() => setCategoryFilter(c.value)}>
                  {c.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={openNewCategory}
                className="text-sky-600 dark:text-sky-400 font-medium focus:text-sky-700 dark:focus:text-sky-300"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <button
          onClick={openAdd}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-semibold text-white shadow-sm
                     bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 transition-all"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-sm text-red-500 dark:text-red-400 py-12">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Stethoscope className="w-8 h-8 text-gray-200 dark:text-slate-700 mb-2" />
          <p className="text-sm text-gray-400 dark:text-slate-500">
            {searchTerm
              ? `Sin resultados para "${searchTerm}"`
              : categoryFilter
                ? `Sin procedimientos en "${categoryFilterLabel}"`
                : 'No hay procedimientos en el catálogo.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(proc => (
            <ProcedureCard
              key={proc.key}
              proc={proc}
              filter={filter}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-slate-500 text-right mt-4">
          {filtered.length} procedimiento{filtered.length !== 1 ? 's' : ''}
          {searchTerm && ` · "${searchTerm}"`}
        </p>
      )}

      {/* Ventana emergente: agregar procedimiento clínico */}
      <VentanaPopup
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Nuevo procedimiento clínico"
        subtitle="Agrega un procedimiento a los que ofrece la clínica."
        icon={Stethoscope}
        contentClassName="sm:max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving || !canSubmit}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Nombre del procedimiento: texto libre o del catálogo normativo */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-slate-400">Nombre del procedimiento</Label>
            <SearchableSelect
              options={catalogOptions}
              value={addForm.catalog_key || addForm.nombre}
              displayLabel={addForm.nombre}
              loading={catalogLoading}
              creatable
              placeholder="Escribe un nombre o selecciona del catálogo…"
              emptyText="Escribe para usar un nombre personalizado"
              createLabel={q => <>Usar «{q}» (personalizado)</>}
              onChange={value => {
                // Si el valor corresponde a una opción del catálogo → normativo
                // (se enlaza vía catalog_key). Si no, es un nombre 100% libre.
                const opt = catalogOptions.find(o => o.value === value)
                setAddForm(prev => opt
                  ? { ...prev, catalog_key: opt.value, nombre: opt.label }
                  : { ...prev, catalog_key: '', nombre: value })
              }}
            />
          </div>

          {/* Tipo de procedimiento (procedure_categories) */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-slate-400">Tipo de procedimiento</Label>
            <SearchableSelect
              options={categoryOptions}
              value={addForm.procedure_category_id}
              loading={categoriesLoading}
              placeholder="Selecciona una categoría…"
              emptyText="Sin categorías"
              onChange={value => setAddForm(prev => ({ ...prev, procedure_category_id: value }))}
            />
          </div>

          {/* Precio */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-slate-400">Precio (opcional)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={addForm.precio}
              onChange={e => setAddForm(prev => ({ ...prev, precio: e.target.value }))}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-slate-400">Descripción (opcional)</Label>
            <Input
              type="text"
              placeholder="Descripción del procedimiento"
              value={addForm.descripcion}
              onChange={e => setAddForm(prev => ({ ...prev, descripcion: e.target.value }))}
            />
          </div>

          {/* Duración estimada (opcional) */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-slate-400">Duración estimada (opcional)</Label>
            <Input
              type="text"
              placeholder="ej. 30 minutes o 00:30:00"
              value={addForm.duracion_estimada}
              onChange={e => setAddForm(prev => ({ ...prev, duracion_estimada: e.target.value }))}
            />
          </div>
        </div>
      </VentanaPopup>

      {/* Ventana emergente: nueva categoría */}
      <VentanaPopup
        open={catOpen}
        onOpenChange={setCatOpen}
        title="Nueva categoría"
        subtitle="Crea una categoría para clasificar los procedimientos clínicos."
        icon={FilterIcon}
        contentClassName="sm:max-w-sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCatOpen(false)} disabled={catSaving}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory} disabled={catSaving || !catName.trim()}>
              {catSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-1">
          <Label className="text-xs text-gray-500 dark:text-slate-400">Nombre de la categoría</Label>
          <Input
            type="text"
            placeholder="ej. Endodoncia"
            value={catName}
            onChange={e => setCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && catName.trim() && !catSaving) handleCreateCategory() }}
            autoFocus
          />
        </div>
      </VentanaPopup>
    </div>
  )
}
