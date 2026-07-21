"use client"

import { useEffect, useRef, useState } from "react"
import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Plus,
  X,
} from "lucide-react"
import VentanaPopup from "./VentanaPopup"
import SearchableSelect from "./SearchableSelect"

type AppointmentStatus = "Confirmed" | "toBeConfirmed" | "Cancelled" | "Completed"

type Cita = {
  id: string
  desc?: string | null
  reason?: string | null
  startDate: string
  endDate: string
  status?: string
  nameId: number
  name: {
    id: number
    nombre: string
    apellido_pat: string | null
    apellido_mat: string | null
    telefono: string
    edad: number | null
    domicilio: string | null
    sexo: string | null
  }
}

type ActiveTreatment = {
  id: number
  nombre: string
}

// Procedimiento del plan activo (treatment_plan_procedures + clinic_procedures).
type PlanProcedure = {
  id: number
  clinic_procedure_id: number
  nombre: string
  cantidad: number | null
}

// Material del inventario físico de la clínica (GET /api/inventory).
type InventoryEntry = {
  material_id: number
  descripcion: string | null
  material_name: { id: number; nombre: string } | null
  item: { id: number; unidad_medica: string | null }
}

// Material de apoyo asignado a un procedimiento: se guarda por procedimiento en
// `materialsByProcedure`. La cantidad y la unidad son editables en la tarjeta.
type AssignedMaterial = {
  materialId: number
  nombre: string
  descripcion: string | null
  cantidad: number
  unidad: string
}

// Unidades de medida frecuentes para el material de apoyo (el select además
// conserva la unidad original del inventario aunque no esté en la lista).
const UNIDADES_MEDIDA = [
  "Pieza", "Caja", "Frasco", "Envase", "Paquete", "Bote", "Tubo", "Sobre",
  "Jeringa", "Kit", "Par", "Rollo", "ml", "mg", "g", "L",
]

const STATUS_CFG: Record<AppointmentStatus, { label: string; dot: string; badge: string }> = {
  Confirmed: {
    label: "Confirmada",
    dot: "bg-green-500",
    badge: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  toBeConfirmed: {
    label: "Por confirmar",
    dot: "bg-yellow-400",
    badge: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  },
  Cancelled: {
    label: "Cancelada",
    dot: "bg-red-500",
    badge: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  Completed: {
    label: "Completada",
    dot: "bg-indigo-500",
    badge: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
}

// Un plan de tratamiento se considera activo mientras no se haya cerrado.
const ACTIVE_PLAN_STATUS = ["in_progress", "authorized"]

function getStatus(s?: string) {
  return STATUS_CFG[(s ?? "") as AppointmentStatus] ?? STATUS_CFG.toBeConfirmed
}

function initials(name: string, ap?: string | null) {
  return `${name?.[0] ?? ""}${ap?.[0] ?? ""}`.toUpperCase() || "?"
}

function fullPatientName(cita: Cita) {
  return [cita.name.nombre, cita.name.apellido_pat, cita.name.apellido_mat].filter(Boolean).join(" ")
}

export default function CitasDentales({ citas = [] }: { citas?: Cita[] }) {
  const [localCitas, setLocalCitas] = useState<Cita[]>(citas)
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [detailsCita, setDetailsCita] = useState<Cita | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // ¿La ventana de detalles está maximizada? En ese modo la pantalla se divide
  // en 3 slots: procedimientos (1) · material de apoyo (2) · buscador (3).
  const [detailsMaximized, setDetailsMaximized] = useState(false)
  // Alto (px) de la ventana de detalles en `lg`, para que el panel de
  // materiales (slot 3) tenga exactamente la misma altura. null = no aplicar
  // (móvil, o ventana cerrada): se usa el alto por defecto del panel.
  const detailsContentRef = useRef<HTMLDivElement>(null)
  const [detailsHeight, setDetailsHeight] = useState<number | null>(null)
  // Tratamientos activos por paciente; undefined = todavía cargando.
  const [treatmentsByPatient, setTreatmentsByPatient] = useState<Record<number, ActiveTreatment[]>>({})
  const requestedPatients = useRef<Set<number>>(new Set())
  // Procedimientos por plan de tratamiento; undefined = todavía cargando.
  const [proceduresByPlan, setProceduresByPlan] = useState<Record<number, PlanProcedure[]>>({})
  const requestedPlans = useRef<Set<number>>(new Set())
  const [selectedProcedureId, setSelectedProcedureId] = useState<number | null>(null)
  // Ventana lateral para asignar materiales de apoyo al procedimiento elegido.
  const [materialsOpen, setMaterialsOpen] = useState(false)
  const [materialValue, setMaterialValue] = useState("")
  // Inventario físico de la clínica (materiales de apoyo disponibles).
  const [inventoryItems, setInventoryItems] = useState<InventoryEntry[]>([])
  const [inventoryLoaded, setInventoryLoaded] = useState(false)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  // Materiales de apoyo asignados por procedimiento (id del procedimiento → lista).
  const [materialsByProcedure, setMaterialsByProcedure] = useState<Record<number, AssignedMaterial[]>>({})

  useEffect(() => {
    setLocalCitas(citas)
  }, [citas])

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))

  const citasSemana = localCitas
    .filter(cita => weekDays.some(day => isSameDay(parseISO(cita.startDate), day)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  const countForDay = (day: Date) =>
    citasSemana.filter(cita => isSameDay(parseISO(cita.startDate), day)).length

  const citasDelDia = citasSemana.filter(cita => isSameDay(parseISO(cita.startDate), selectedDay))
  const selectedDayIsToday = isSameDay(selectedDay, today)

  // Clave estable con los pacientes visibles para no relanzar el efecto en cada render.
  const patientIdsKey = [...new Set(citasDelDia.map(cita => cita.nameId))].sort((a, b) => a - b).join(",")

  useEffect(() => {
    const ids = patientIdsKey ? patientIdsKey.split(",").map(Number) : []
    const pending = ids.filter(id => !requestedPatients.current.has(id))
    if (pending.length === 0) return

    pending.forEach(id => requestedPatients.current.add(id))
    let cancelled = false

    const loadTreatments = async () => {
      const results = await Promise.all(
        pending.map(async id => {
          try {
            const response = await fetch(`/api/treatment-plans?patientId=${id}`)
            if (!response.ok) throw new Error("No se pudieron cargar los tratamientos")
            const body: { plans?: { id: number; nombre: string; status: string | null }[] } =
              await response.json()
            const activos = (body.plans ?? [])
              .filter(plan => ACTIVE_PLAN_STATUS.includes(plan.status ?? ""))
              .map(plan => ({ id: plan.id, nombre: plan.nombre }))
            return [id, activos] as const
          } catch {
            // Permite reintentar en el siguiente render que muestre a este paciente.
            requestedPatients.current.delete(id)
            return [id, [] as ActiveTreatment[]] as const
          }
        }),
      )

      if (cancelled) return
      setTreatmentsByPatient(previous => {
        const next = { ...previous }
        for (const [id, activos] of results) next[id] = activos
        return next
      })
    }

    loadTreatments()

    return () => {
      cancelled = true
    }
  }, [patientIdsKey])

  // Plan activo del paciente de la ventana de detalles (el más reciente).
  const detailsTreatments = detailsCita ? treatmentsByPatient[detailsCita.nameId] : undefined
  const activePlan = detailsTreatments?.[0]
  const activePlanId = activePlan?.id ?? null
  const planProcedures = activePlanId ? proceduresByPlan[activePlanId] : undefined
  const detailsStatus = detailsCita ? getStatus(detailsCita.status) : null

  // Procedimientos del plan activo: se cargan al abrir la ventana de detalles.
  useEffect(() => {
    if (!detailsOpen || !activePlanId || requestedPlans.current.has(activePlanId)) return

    requestedPlans.current.add(activePlanId)
    let cancelled = false

    const loadProcedures = async () => {
      try {
        const response = await fetch(`/api/treatment-plans/${activePlanId}`)
        if (!response.ok) throw new Error("No se pudieron cargar los procedimientos")
        const body: { plan?: { procedures?: PlanProcedure[] } } = await response.json()
        if (cancelled) return
        setProceduresByPlan(previous => ({ ...previous, [activePlanId]: body.plan?.procedures ?? [] }))
      } catch {
        requestedPlans.current.delete(activePlanId)
      }
    }

    loadProcedures()

    return () => {
      cancelled = true
    }
  }, [detailsOpen, activePlanId])

  // El primer procedimiento queda seleccionado siempre que no haya otro válido.
  useEffect(() => {
    if (!planProcedures || planProcedures.length === 0) {
      setSelectedProcedureId(null)
      return
    }
    setSelectedProcedureId(previous =>
      previous && planProcedures.some(procedure => procedure.id === previous)
        ? previous
        : planProcedures[0].id,
    )
  }, [planProcedures])

  const selectedProcedure = planProcedures?.find(procedure => procedure.id === selectedProcedureId)

  // Mide el alto real de la ventana de detalles (que se ajusta a su contenido)
  // y lo refleja en el panel de materiales para que ambos coincidan. Solo en
  // `lg`; en pantallas menores el panel usa su alto por defecto.
  useEffect(() => {
    if (!detailsOpen) {
      setDetailsHeight(null)
      return
    }
    const el = detailsContentRef.current
    if (!el || typeof ResizeObserver === "undefined") return

    const mq = window.matchMedia("(min-width: 1024px)")
    const update = () => setDetailsHeight(mq.matches ? el.offsetHeight : null)

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    mq.addEventListener("change", update)
    return () => {
      observer.disconnect()
      mq.removeEventListener("change", update)
    }
  }, [detailsOpen])

  // Materiales de apoyo ya asignados al procedimiento seleccionado.
  const assignedMaterials = selectedProcedureId ? materialsByProcedure[selectedProcedureId] ?? [] : []

  // Catálogo del inventario: se carga la primera vez que se abre la ventana de
  // materiales, para no consultar la base de datos si nunca se usa.
  const loadInventory = () => {
    if (inventoryLoaded || inventoryLoading) return
    setInventoryLoading(true)
    fetch("/api/inventory")
      .then(r => r.json())
      .then(d => {
        setInventoryItems(d.items ?? [])
        setInventoryLoaded(true)
      })
      .catch(console.error)
      .finally(() => setInventoryLoading(false))
  }

  // Opciones del buscador: todo el inventario, salvo lo ya asignado al
  // procedimiento actual (para no duplicar).
  const inventoryOptions = inventoryItems
    .filter(inv => !assignedMaterials.some(m => m.materialId === inv.material_id))
    .map(inv => ({
      value: String(inv.material_id),
      label: inv.material_name?.nombre ?? inv.descripcion ?? "Material",
      description: inv.descripcion ?? undefined,
    }))

  // Agrega el material elegido en el buscador a la lista del procedimiento.
  const addMaterial = (materialIdStr: string) => {
    if (!selectedProcedureId || !materialIdStr) return
    const inv = inventoryItems.find(i => String(i.material_id) === materialIdStr)
    if (!inv) return
    setMaterialsByProcedure(prev => {
      const list = prev[selectedProcedureId] ?? []
      if (list.some(m => m.materialId === inv.material_id)) return prev
      return {
        ...prev,
        [selectedProcedureId]: [
          ...list,
          {
            materialId: inv.material_id,
            nombre: inv.material_name?.nombre ?? inv.descripcion ?? "Material",
            descripcion: inv.descripcion ?? null,
            cantidad: 1,
            unidad: inv.item.unidad_medica || "Pieza",
          },
        ],
      }
    })
    setMaterialValue("")
  }

  const updateMaterial = (procId: number, materialId: number, patch: Partial<AssignedMaterial>) => {
    setMaterialsByProcedure(prev => ({
      ...prev,
      [procId]: (prev[procId] ?? []).map(m => (m.materialId === materialId ? { ...m, ...patch } : m)),
    }))
  }

  const removeMaterial = (procId: number, materialId: number) => {
    setMaterialsByProcedure(prev => ({
      ...prev,
      [procId]: (prev[procId] ?? []).filter(m => m.materialId !== materialId),
    }))
  }

  const openDetails = (cita: Cita) => {
    setDetailsCita(cita)
    setDetailsOpen(true)
  }

  const closeDetails = () => {
    setDetailsOpen(false)
    setDetailsCita(null)
    setMaterialsOpen(false)
    setMaterialValue("")
    setMaterialsByProcedure({})
    setDetailsMaximized(false)
  }

  // Al maximizar la ventana de detalles, el buscador de materiales (slot 3) debe
  // quedar siempre visible; se abre solo y precarga el inventario.
  const handleDetailsMaximized = (maximized: boolean) => {
    setDetailsMaximized(maximized)
    if (maximized) {
      loadInventory()
      setMaterialsOpen(true)
    }
  }

  // Ventana de materiales (slot 3). En móvil es una hoja inferior de alto fijo.
  // En `lg` se ancla al tercio derecho; su alto iguala al de la ventana de
  // detalles: en modo normal toma el alto medido (`materialsContentStyle`,
  // centrado en Y), y a pantalla completa si la ventana de detalles está
  // maximizada.
  const materialsContentClassName =
    "h-[400px] sm:max-w-xs max-lg:top-auto max-lg:bottom-0 max-lg:translate-y-0 " +
    "lg:left-[66.666vw] lg:translate-x-0 lg:w-[33.333vw] lg:max-w-none lg:rounded-none " +
    (detailsMaximized
      ? "lg:top-0 lg:translate-y-0 lg:h-screen lg:max-h-screen"
      : "lg:max-h-[85vh]")

  // En `lg` normal, replica el alto medido de la ventana de detalles. En móvil
  // o maximizada, el alto lo define la clase (no se aplica estilo en línea).
  const materialsContentStyle =
    !detailsMaximized && detailsHeight ? { height: detailsHeight } : undefined

  // Animación: móvil desde abajo (X centrado para no saltar); en `lg` desde el
  // borde derecho. En modo normal la ventana queda centrada en Y, así que la
  // entrada conserva el translate-y-[-50%] de reposo (from-top-[50%]).
  const materialsAnimationClassName =
    "max-lg:data-[state=open]:slide-in-from-left-1/2 max-lg:data-[state=closed]:slide-out-to-left-1/2 " +
    "max-lg:data-[state=open]:slide-in-from-bottom-full max-lg:data-[state=closed]:slide-out-to-bottom-full " +
    "lg:data-[state=open]:slide-in-from-right-full lg:data-[state=closed]:slide-out-to-right-full " +
    (detailsMaximized
      ? ""
      : "lg:data-[state=open]:slide-in-from-top-[50%] lg:data-[state=closed]:slide-out-to-top-[50%]")

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3.5 shadow-sm">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide font-medium">Hoy</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-slate-100 mt-0.5">
            {countForDay(today)}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500">citas</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3.5 shadow-sm">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide font-medium">Esta semana</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-slate-100 mt-0.5">
            {citasSemana.length}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500">lunes a sabado</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3.5 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide font-medium">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-500 mt-0.5">
            {citasSemana.filter(cita => !cita.status || cita.status === "toBeConfirmed").length}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500">por confirmar</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Semana actual</p>
        <div className="grid grid-cols-6 gap-1.5">
          {weekDays.map(day => {
            const active = isSameDay(day, selectedDay)
            const count = countForDay(day)
            return (
              <button
                type="button"
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl
                  ${active
                    ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md"
                    : "bg-gray-50 dark:bg-slate-700/60 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${active ? "text-sky-100" : "text-gray-400 dark:text-slate-500"}`}>
                  {format(day, "EEE", { locale: es })}
                </span>
                <span className="text-base font-bold">{format(day, "d")}</span>
                <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center
                  ${active ? "bg-white/25 text-white" : "bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400"}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-700">
          <p className="text-sm font-bold text-gray-800 dark:text-slate-100">
            {selectedDayIsToday ? "Citas de hoy" : "Citas del dia seleccionado"}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">
            {format(selectedDay, "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>

        {citasDelDia.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5 text-gray-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Sin citas para este dia</p>
          </div>
        ) : (
          <div className="space-y-3 p-5">
            {citasDelDia.map(cita => {
              const st = getStatus(cita.status)
              const ini = initials(cita.name.nombre, cita.name.apellido_pat)
              const appointmentText = cita.reason || cita.desc
              const isCompleted = cita.status === "Completed"
              const tratamientos = treatmentsByPatient[cita.nameId]

              return (
                <div
                  key={cita.id}
                  className="flex flex-col gap-4 rounded-xl border border-gray-100 px-4 py-4 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5 min-w-[48px]">
                      <Clock className="w-3 h-3 text-sky-400 mb-0.5" />
                      <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                        {format(parseISO(cita.startDate), "HH:mm")}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">
                        {format(parseISO(cita.endDate), "HH:mm")}
                      </span>
                    </div>

                    <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 grid place-items-center text-white text-sm font-bold overflow-hidden">
                      <span className="leading-none">{ini}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{fullPatientName(cita)}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                        {isCompleted && (
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300"
                            aria-label="Cita completada"
                            title="Cita completada"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        )}
                      </div>

                      {appointmentText && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {appointmentText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 sm:w-52 sm:shrink-0 sm:text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      Tratamientos activos
                    </p>
                    {tratamientos === undefined ? (
                      <p className="mt-1 text-xs text-gray-300 dark:text-slate-600">Cargando...</p>
                    ) : tratamientos.length === 0 ? (
                      <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Sin tratamientos activos</p>
                    ) : (
                      <div className="mt-1 space-y-0.5">
                        {tratamientos.map(tratamiento => (
                          <p
                            key={tratamiento.id}
                            className="truncate text-xs font-medium text-gray-700 dark:text-slate-200"
                            title={tratamiento.nombre}
                          >
                            {tratamiento.nombre}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={() => openDetails(cita)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300 dark:hover:bg-sky-900/40"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Detalles
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {citasDelDia.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30">
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
              {citasDelDia.length} {citasDelDia.length === 1 ? "cita" : "citas"} el {selectedDayIsToday ? "dia de hoy" : format(selectedDay, "d 'de' MMMM", { locale: es })}
            </p>
          </div>
        )}
      </div>

      {/* ════════ Ventana de detalles de la cita ════════
          Desde `lg` las dos ventanas se colocan lado a lado y centradas como un
          bloque: 470 (detalles) + 16 (separación) + 320 (materiales) = 806 de
          ancho. Detalles arranca en -403 (mitad del bloque) y materiales en
          -403 + 470 + 16 = +83.

          Por debajo de `lg` se apilan: materiales entra deslizándose desde abajo
          y queda anclada al borde inferior (400 de alto), y detalles se sube
          apoyando su base 8 por encima (400 + 8 = 408), limitando su alto al
          espacio que queda libre arriba. */}
      <VentanaPopup
        open={detailsOpen}
        onOpenChange={open => (open ? setDetailsOpen(true) : closeDetails())}
        title={
          detailsCita && detailsStatus ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{fullPatientName(detailsCita)}</span>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${detailsStatus.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${detailsStatus.dot}`} />
                {detailsStatus.label}
              </span>
            </span>
          ) : (
            "Detalles de la cita"
          )
        }
        subtitle={
          detailsCita
            ? `${format(parseISO(detailsCita.startDate), "EEEE d 'de' MMMM yyyy", { locale: es })} · ${format(parseISO(detailsCita.startDate), "HH:mm")} - ${format(parseISO(detailsCita.endDate), "HH:mm")}`
            : undefined
        }
        icon={CalendarClock}
        onMaximizedChange={handleDetailsMaximized}
        contentRef={detailsContentRef}
        // Normal: la ventana ocupa 1/3 del viewport centrado (slot 2) y se ajusta
        // a su contenido (max 85vh). Su alto real se mide y se replica en el panel
        // de materiales (slot 3) para que ambos coincidan sin espacio sobrante.
        contentClassName={`sm:max-w-[470px] lg:w-[33.333vw] lg:max-w-none ${
          materialsOpen
            ? "max-lg:top-auto max-lg:bottom-[408px] max-lg:translate-y-0 max-lg:max-h-[calc(100dvh_-_416px)]"
            : ""
        }`}
        // Maximizada: en `lg` ocupa 2/3 (slots 1 y 2), anclada a la izquierda,
        // dejando el slot 3 para el buscador de materiales. En móvil, pantalla
        // completa como de costumbre.
        maximizedClassName="h-screen max-h-screen w-screen max-w-none rounded-none lg:left-0 lg:translate-x-0 lg:w-[66.666vw]"
      >
        {detailsCita && (
          <div className="space-y-6">
            {/* ─── Tratamiento activo ─── */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                Tratamiento activo
              </p>
              {detailsTreatments === undefined ? (
                <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">Cargando tratamiento...</p>
              ) : activePlan ? (
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                  {activePlan.nombre}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
                  Este paciente no tiene tratamientos activos.
                </p>
              )}
            </section>

            {/* ─── Detalles: procedimientos (izq.) + materiales (der.) ─── */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                Detalles
              </p>

              <div className={`mt-2 grid grid-cols-1 ${detailsMaximized ? "sm:grid-cols-2" : "sm:grid-cols-[0.8fr_1.2fr]"}`}>
                {/* Columna izquierda: procedimientos del plan activo. */}
                <div className="min-w-0 sm:pr-5">
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                    Procedimientos a realizar
                  </p>

                  {!activePlanId ? (
                    <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                      Sin plan de tratamiento activo.
                    </p>
                  ) : planProcedures === undefined ? (
                    <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                      Cargando procedimientos...
                    </p>
                  ) : planProcedures.length === 0 ? (
                    <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                      Este tratamiento no tiene procedimientos registrados.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {planProcedures.map(procedure => {
                        const selected = procedure.id === selectedProcedureId
                        return (
                          <li key={procedure.id} className="relative">
                            <button
                              type="button"
                              onClick={() => setSelectedProcedureId(procedure.id)}
                              className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-all
                                ${selected
                                  ? "border-sky-200 bg-sky-50 font-semibold text-sky-700 shadow-sm dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                                  : "border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-700/40"}`}
                            >
                              <span
                                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full transition-colors
                                  ${selected
                                    ? "bg-sky-500 text-white"
                                    : "bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500"}`}
                              >
                                {selected ? <CheckCircle2 className="h-3 w-3" /> : <Plus className="h-2.5 w-2.5" />}
                              </span>
                              <span className="truncate">{procedure.nombre}</span>
                              {procedure.cantidad !== null && procedure.cantidad > 1 && (
                                <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium
                                  ${selected
                                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
                                    : "bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500"}`}>
                                  x{procedure.cantidad}
                                </span>
                              )}
                            </button>
                            {/* Línea que enlaza el procedimiento elegido con la
                                zona de "Material de Apoyo". */}
                            {selected && (
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute left-full top-1/2 hidden h-0.5 w-5 bg-sky-400 dark:bg-sky-500 sm:block"
                              />
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                {/* Columna derecha: materiales de apoyo del procedimiento elegido. */}
                <div className="mt-5 min-w-0 border-gray-100 dark:border-slate-700 sm:mt-0 sm:border-l sm:pl-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                      Material de Apoyo
                    </p>
                    <button
                      type="button"
                      disabled={!selectedProcedure}
                      onClick={() => { loadInventory(); setMaterialsOpen(true) }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300 dark:hover:bg-sky-900/40"
                    >
                      <Plus className="h-3 w-3" />
                      agregar
                    </button>
                  </div>

                  {assignedMaterials.length === 0 ? (
                    <p className="mt-2 text-xs leading-relaxed text-gray-400 dark:text-slate-500">
                      Aun no se ha asignado ningun material de apoyo para este procedimiento.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {assignedMaterials.map(material => {
                        // Opciones de unidad: las frecuentes + la del inventario si no está.
                        const unidadOptions = UNIDADES_MEDIDA.includes(material.unidad)
                          ? UNIDADES_MEDIDA
                          : [material.unidad, ...UNIDADES_MEDIDA]
                        return (
                          <li
                            key={material.materialId}
                            className="rounded-xl border border-gray-100 bg-gray-50/60 p-2.5 dark:border-slate-700 dark:bg-slate-700/40"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-200" title={material.nombre}>
                                  {material.nombre}
                                </p>
                                {material.descripcion && (
                                  <p className="truncate text-[11px] leading-snug text-gray-400 dark:text-slate-500" title={material.descripcion}>
                                    {material.descripcion}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => selectedProcedureId && removeMaterial(selectedProcedureId, material.materialId)}
                                title="Quitar material"
                                aria-label="Quitar material"
                                className="shrink-0 rounded-md p-0.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                value={material.cantidad}
                                onChange={e =>
                                  selectedProcedureId &&
                                  updateMaterial(selectedProcedureId, material.materialId, {
                                    cantidad: Math.max(1, parseInt(e.target.value, 10) || 1),
                                  })
                                }
                                title="Cantidad a utilizar"
                                className="h-7 w-12 shrink-0 rounded-lg border border-gray-200 bg-white text-center text-xs tabular-nums text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <select
                                value={material.unidad}
                                onChange={e =>
                                  selectedProcedureId &&
                                  updateMaterial(selectedProcedureId, material.materialId, { unidad: e.target.value })
                                }
                                title="Unidad de medida"
                                className="h-7 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                              >
                                {unidadOptions.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  <div className="mt-4 border-t border-dashed border-gray-200 pt-2 dark:border-slate-700">
                    <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-gray-400 dark:text-slate-500">
                      <Package className="mt-0.5 h-3 w-3 shrink-0" />
                      Estos materiales se descontaran del stock una vez que la cita se marque como
                      &quot;completada&quot;.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </VentanaPopup>

      {/* ════════ Ventana de materiales del procedimiento elegido ════════
          Overlay transparente para no oscurecer la ventana de detalles, que
          queda visible al lado (o arriba, en móvil).

          En `lg` se ancla como panel del slot 3 (tercio derecho del viewport),
          pegado a la ventana de detalles, con su misma altura (ver
          `materialsContentClassName`). En móvil sigue siendo una hoja inferior
          de alto fijo (400) para que el buscador desplegado no se recorte. */}
      <VentanaPopup
        open={materialsOpen}
        onOpenChange={open => {
          setMaterialsOpen(open)
          if (!open) setMaterialValue("")
        }}
        title="Materiales de Apoyo para:"
        subtitle={selectedProcedure?.nombre}
        hideWindowControls
        overlayClassName="bg-transparent"
        contentClassName={materialsContentClassName}
        contentStyle={materialsContentStyle}
        animationClassName={materialsAnimationClassName}
      >
        <div className="space-y-3">
          <div className="min-w-0">
            <SearchableSelect
              options={inventoryOptions}
              value={materialValue}
              onChange={addMaterial}
              onOpen={loadInventory}
              loading={inventoryLoading}
              placeholder="Buscar material"
              direction="down"
              defaultOpen
              keepOpenOnSelect
              emptyText={
                inventoryLoaded
                  ? "No tienes materiales de apoyo en tu inventario"
                  : "Sin coincidencias"
              }
            />
          </div>
        </div>
      </VentanaPopup>
    </div>
  )
}
