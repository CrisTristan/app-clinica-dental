"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import {
  Activity, Stethoscope, User, Calendar, ListChecks, ArrowLeft, ChevronRight,
  ClipboardList, CalendarCheck, DollarSign, FileText, Save, Check, FileCheck,
} from "lucide-react"

// Un plan de tratamiento tal como lo devuelve GET /api/treatment-plans.
type Plan = {
  id: number
  nombre: string
  dentista: string | null
  status: string | null
  created_at: string
}

// Un procedimiento del plan (nombre, cantidad, precio y estado propio).
type Procedure = {
  nombre: string
  cantidad: number | null
  precio: number | string | null
  status: string | null
}

// Detalle completo de un plan (GET /api/treatment-plans/:id).
type PlanDetail = {
  id: number
  nombre: string
  paciente: string | null
  dentist_id: string | null
  dentista: string | null
  status: string | null
  created_at: string
  authorized_at: string | null
  total: number | string | null
  observaciones: string | null
  has_consent: boolean
  procedures: Procedure[]
}

type Dentist = { id: string; nombre: string }

const STATUSES = ["draft", "authorized", "unauthorized", "in_progress", "completed", "cancelled"] as const

// Colores del badge según el estado del plan de tratamiento (enum de la BD).
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600",
  authorized: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  unauthorized: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  in_progress: "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  completed: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  cancelled: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
}

// Traducción al español de cada valor del enum de estado.
const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  authorized: "Autorizado",
  unauthorized: "No autorizado",
  in_progress: "En proceso",
  completed: "Completado",
  cancelled: "Cancelado",
}

const STATUS_FALLBACK =
  "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600"

// Estado propio de cada procedimiento (enum distinto al del plan).
const PROC_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En proceso",
  completed: "Completado",
  cancelled: "Cancelado",
}

const PROC_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  in_progress: "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  completed: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  cancelled: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
}

const formatStatus = (status: string | null) =>
  (status && STATUS_LABELS[status]) || "Sin estado"

const formatProcStatus = (status: string | null) =>
  (status && PROC_STATUS_LABELS[status]) || "Sin estado"

const formatDate = (value: string | null) => {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
}

// Convierte un timestamp de la BD al formato yyyy-mm-dd que espera <input type="date">.
const toDateInput = (value: string | null) => {
  if (!value) return ""
  const d = new Date(value)
  if (isNaN(d.getTime())) return ""
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

const formatMoney = (value: number | string | null) => {
  const n = typeof value === "string" ? parseFloat(value) : value
  if (n == null || isNaN(n)) return null
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const labelClass =
  "block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide"

// Plantilla de columnas compartida entre el encabezado y las filas de la lista.
// Cuatro columnas de igual ancho para un espaciado equitativo.
const listGrid =
  "grid grid-cols-4 gap-3 items-center"

/* ── Campo de solo lectura (autocompletado, no editable) ── */
function ReadonlyField({
  label, icon: Icon, value, empty = "—",
}: {
  label: string; icon: React.ElementType; value: string | null; empty?: string
}) {
  const isEmpty = !value
  return (
    <div className="space-y-1.5">
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50/70 dark:bg-slate-700/40">
        <Icon className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
        <span className={`truncate text-sm ${isEmpty ? "text-gray-400 dark:text-slate-500 italic" : "text-gray-800 dark:text-slate-100"}`}>
          {value || empty}
        </span>
      </div>
    </div>
  )
}

/* ── Modal para ver y editar los planes de tratamiento del paciente ── */
export default function TratamientosActivos({ id }: { id: string | null }) {
  const [open, setOpen] = useState(false)

  // Vista lista de tratamientos.
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Vista detalle de un tratamiento seleccionado.
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<PlanDetail | null>(null)
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  // Campos editables del formulario.
  const [status, setStatus] = useState("")
  const [dentistId, setDentistId] = useState("")
  const [authorizedAt, setAuthorizedAt] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [generarConsentimiento, setGenerarConsentimiento] = useState(false)
  const [saving, setSaving] = useState(false)

  // Vista 3: hoja de consentimiento (exclusiva del tratamiento seleccionado).
  const [consentView, setConsentView] = useState(false)

  const view: "list" | "detail" | "consent" =
    selectedId == null ? "list" : consentView ? "consent" : "detail"

  // Carga los planes al abrir el modal.
  const loadPlans = () => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetch(`/api/treatment-plans?patientId=${id}`)
      .then(async r => {
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || `Error ${r.status}`)
        return b
      })
      .then(d => setPlans(d.plans ?? []))
      .catch(e => setError(e instanceof Error ? e.message : "No se pudieron cargar los tratamientos"))
      .finally(() => setLoading(false))
  }

  // Abre la vista de detalle y carga los datos del plan seleccionado.
  const openDetail = (planId: number) => {
    setSelectedId(planId)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    fetch(`/api/treatment-plans/${planId}`)
      .then(async r => {
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || `Error ${r.status}`)
        return b
      })
      .then((d: { plan: PlanDetail; dentists: Dentist[] }) => {
        setDetail(d.plan)
        setDentists(d.dentists ?? [])
        setStatus(d.plan.status ?? "")
        setDentistId(d.plan.dentist_id ?? "")
        setAuthorizedAt(toDateInput(d.plan.authorized_at))
        setObservaciones(d.plan.observaciones ?? "")
        setGenerarConsentimiento(false)
      })
      .catch(e => setDetailError(e instanceof Error ? e.message : "No se pudo cargar el tratamiento"))
      .finally(() => setDetailLoading(false))
  }

  const backToList = () => {
    setSelectedId(null)
    setDetail(null)
    setDetailError(null)
    setConsentView(false)
  }

  // Solo hay cambios que guardar si algún campo editable difiere del original
  // (o si se pidió generar la hoja de consentimiento y aún no existe).
  const dirty = !!detail && (
    status !== (detail.status ?? "") ||
    dentistId !== (detail.dentist_id ?? "") ||
    authorizedAt !== toDateInput(detail.authorized_at) ||
    observaciones !== (detail.observaciones ?? "") ||
    (!detail.has_consent && generarConsentimiento)
  )

  const handleSave = async () => {
    if (!detail || !dirty) return
    setSaving(true)
    try {
      const res = await fetch(`/api/treatment-plans/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          dentist_id: dentistId || null,
          authorized_at: authorizedAt || null,
          observaciones,
          generar_consentimiento: !detail.has_consent && generarConsentimiento,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => null)
        throw new Error(b?.error || `Error ${res.status}`)
      }
      const { has_consent } = await res.json().catch(() => ({ has_consent: detail.has_consent }))
      const nuevoDentista = dentists.find(d => d.id === dentistId)?.nombre ?? null
      // Refleja los cambios tanto en el detalle como en la tarjeta de la lista.
      setDetail(prev => prev ? { ...prev, status, dentist_id: dentistId || null, dentista: nuevoDentista, authorized_at: authorizedAt || null, observaciones: observaciones.trim() || null, has_consent: has_consent ?? prev.has_consent } : prev)
      setPlans(prev => prev.map(p => p.id === detail.id ? { ...p, status, dentista: nuevoDentista } : p))
      setGenerarConsentimiento(false)
      toast({ title: "Tratamiento actualizado" })
    } catch (e) {
      toast({
        title: "No se pudo guardar",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        setOpen(o)
        if (o) loadPlans()
        else backToList()
      }}
    >
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-sky-600 dark:text-sky-400
                     bg-white/90 dark:bg-slate-800/80 border border-sky-200 dark:border-sky-800
                     rounded-xl shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all"
        >
          <Activity className="w-4 h-4" />
          Tratamientos activos
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700">
        {/* Acceso a la hoja de consentimiento — a la izquierda de la "X", solo si el
            tratamiento ya tiene una hoja activa y estamos en la vista de detalle. */}
        {view === "detail" && detail?.has_consent && (
          <button
            type="button"
            onClick={() => setConsentView(true)}
            title="Hoja de consentimiento"
            className="absolute right-11 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg border border-sky-200 dark:border-sky-800
                       bg-sky-50 dark:bg-sky-900/20 px-2.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-300
                       hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hoja de consentimiento</span>
          </button>
        )}
        <DialogHeader className={view === "detail" && detail?.has_consent ? "pr-56" : ""}>
          <DialogTitle className="flex items-center gap-2 text-gray-800 dark:text-slate-100">
            {view !== "list" && (
              <button
                type="button"
                onClick={view === "consent" ? () => setConsentView(false) : backToList}
                title={view === "consent" ? "Volver al detalle" : "Volver a la lista"}
                className="shrink-0 -ml-1 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-sky-600 dark:hover:bg-slate-700 dark:hover:text-sky-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {view === "consent" ? <FileCheck className="w-4 h-4 text-sky-500" /> : <Activity className="w-4 h-4 text-sky-500" />}
            {view === "consent"
              ? "Hoja de consentimiento"
              : view === "detail"
              ? "Detalle del tratamiento"
              : "Tratamientos del paciente"}
          </DialogTitle>
          <DialogDescription className="text-gray-400 dark:text-slate-500">
            {view === "consent"
              ? "Hoja de consentimiento del tratamiento"
              : view === "detail"
              ? "Consulta y completa la información del plan de tratamiento"
              : "Planes de tratamiento en proceso de este paciente"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Vista lista ── */}
        {view === "list" && (
          <div className="pt-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50/60 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                {error}
              </div>
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 py-12 text-center">
                <ListChecks className="w-6 h-6 text-gray-200 dark:text-slate-700" />
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Este paciente no tiene tratamientos registrados
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  {/* Encabezado de columnas */}
                  <div className={`${listGrid} px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500`}>
                    <span>Nombre</span>
                    <span>Dentista</span>
                    <span>Fecha creación</span>
                    <span className="pr-6 text-right">Estado</span>
                  </div>

                  <ul className="space-y-2">
                    {plans.map(plan => (
                      <li key={plan.id}>
                        <button
                          type="button"
                          onClick={() => openDetail(plan.id)}
                          className={`group ${listGrid} w-full text-left rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-700/40 px-4 py-3
                                     hover:border-sky-200 dark:hover:border-sky-800 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all`}
                        >
                          {/* Nombre */}
                          <span className="flex items-center gap-2 min-w-0">
                            <Stethoscope className="w-4 h-4 shrink-0 text-sky-500" />
                            <span className="truncate text-sm font-semibold text-gray-800 dark:text-slate-100">
                              {plan.nombre}
                            </span>
                          </span>
                          {/* Dentista */}
                          <span className="flex items-center gap-1.5 min-w-0 text-xs text-gray-500 dark:text-slate-400">
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{plan.dentista ?? "Sin asignar"}</span>
                          </span>
                          {/* Fecha de creación */}
                          <span className="flex items-center gap-1.5 min-w-0 text-xs text-gray-500 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{formatDate(plan.created_at)}</span>
                          </span>
                          {/* Estado */}
                          <span className="flex items-center justify-end gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium
                                ${STATUS_STYLES[plan.status ?? ""] ?? STATUS_FALLBACK}`}
                            >
                              {formatStatus(plan.status)}
                            </span>
                            <ChevronRight className="w-4 h-4 shrink-0 text-gray-300 dark:text-slate-500 group-hover:text-sky-500 transition-colors" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Vista detalle ── */}
        {view === "detail" && (
          <div className="pt-2">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : detailError ? (
              <div className="rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50/60 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                {detailError}
              </div>
            ) : detail ? (
              <div className="space-y-5">
                {/* Datos autocompletados (solo lectura) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReadonlyField label="Nombre del tratamiento" icon={Stethoscope} value={detail.nombre} />
                  <ReadonlyField label="Paciente" icon={User} value={detail.paciente} empty="Sin paciente" />
                  <ReadonlyField label="Fecha de creación" icon={Calendar} value={formatDate(detail.created_at)} />
                  <ReadonlyField label="Total" icon={DollarSign} value={formatMoney(detail.total)} empty="Sin total" />
                </div>

                {/* Campos editables */}
                <div className="space-y-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-sky-500" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Datos editables</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Estado */}
                    <div className="space-y-1.5">
                      <label className={labelClass}>Estado</label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-slate-600
                                   bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                                   focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>

                    {/* Dentista responsable */}
                    <div className="space-y-1.5">
                      <label className={labelClass}>Dentista responsable</label>
                      <select
                        value={dentistId}
                        onChange={e => setDentistId(e.target.value)}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-slate-600
                                   bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                                   focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
                      >
                        <option value="">— Sin asignar —</option>
                        {dentists.map(d => (
                          <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Fecha de autorización */}
                    <div className="space-y-1.5">
                      <label className={`${labelClass} flex items-center gap-1.5`}>
                        <CalendarCheck className="w-3.5 h-3.5" />
                        Fecha de autorización
                      </label>
                      <input
                        type="date"
                        value={authorizedAt}
                        onChange={e => setAuthorizedAt(e.target.value)}
                        className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-slate-600
                                   bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                                   focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors
                                   [&::-webkit-calendar-picker-indicator]:dark:invert"
                      />
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="space-y-1.5">
                    <label className={`${labelClass} flex items-center gap-1.5`}>
                      <FileText className="w-3.5 h-3.5" />
                      Observaciones
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={e => setObservaciones(e.target.value)}
                      rows={4}
                      placeholder="Agrega notas u observaciones sobre este tratamiento…"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600
                                 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 resize-y
                                 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
                    />
                  </div>

                  {/* Generar hoja de consentimiento — solo si aún no existe una */}
                  {!detail.has_consent && (
                    <div className="space-y-2 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30 p-3">
                      <label className={`${labelClass} flex items-center gap-1.5`}>
                        <FileCheck className="w-3.5 h-3.5" />
                        Generar hoja de consentimiento
                      </label>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Se creará una hoja de consentimiento para este tratamiento al guardar.
                      </p>
                      <div className="flex gap-2 pt-0.5">
                        {[{ v: true, label: "Sí" }, { v: false, label: "No" }].map(opt => {
                          const active = generarConsentimiento === opt.v
                          return (
                            <button
                              key={String(opt.v)}
                              type="button"
                              onClick={() => setGenerarConsentimiento(opt.v)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors
                                ${active
                                  ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                                  : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
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

                {/* Procedimientos del tratamiento */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-sky-500" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                      Procedimientos ({detail.procedures.length})
                    </h3>
                  </div>

                  {detail.procedures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 py-8 text-center">
                      <ListChecks className="w-6 h-6 text-gray-200 dark:text-slate-700" />
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Este tratamiento no tiene procedimientos registrados
                      </p>
                    </div>
                  ) : (
                    <ul className="rounded-xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700 overflow-hidden">
                      {detail.procedures.map((proc, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50/40 dark:bg-slate-700/30">
                          <span className="grid place-items-center w-6 h-6 shrink-0 rounded-lg bg-sky-100 dark:bg-sky-900/40
                                           text-[11px] font-bold text-sky-600 dark:text-sky-300">
                            {i + 1}
                          </span>
                          <span className="flex-1 min-w-0 truncate text-sm text-gray-700 dark:text-slate-200">
                            {proc.nombre}
                          </span>
                          <span className="shrink-0 text-xs text-gray-400 dark:text-slate-500 tabular-nums">
                            {proc.cantidad ?? 1} × {formatMoney(proc.precio) ?? "$0.00"}
                          </span>
                          <span
                            className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium
                              ${PROC_STATUS_STYLES[proc.status ?? ""] ?? STATUS_FALLBACK}`}
                          >
                            {formatProcStatus(proc.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  {dirty && (
                    <span className="text-xs text-gray-400 dark:text-slate-500">Hay cambios sin guardar</span>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                               bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                               rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Vista hoja de consentimiento (exclusiva) ── */}
        {view === "consent" && (
          <div className="pt-2">
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30 min-h-[320px] p-6 text-center">
              <p className="text-sm text-gray-400 dark:text-slate-500">
                Aquí se mostrará la hoja de consentimiento.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
