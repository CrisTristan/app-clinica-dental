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

  const openDetails = (cita: Cita) => {
    setDetailsCita(cita)
    setDetailsOpen(true)
  }

  const closeDetails = () => {
    setDetailsOpen(false)
    setDetailsCita(null)
    setMaterialsOpen(false)
    setMaterialValue("")
  }

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
        contentClassName={`sm:max-w-[470px] lg:transition-transform ${
          materialsOpen
            ? "max-lg:top-auto max-lg:bottom-[408px] max-lg:translate-y-0 max-lg:max-h-[calc(100dvh_-_416px)] lg:translate-x-[-403px]"
            : ""
        }`}
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

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2">
                {/* Columna izquierda: procedimientos del plan activo. */}
                <div className="sm:pr-5">
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
                    <ul className="mt-2 space-y-1">
                      {planProcedures.map(procedure => {
                        const selected = procedure.id === selectedProcedureId
                        return (
                          <li key={procedure.id} className="relative">
                            <button
                              type="button"
                              onClick={() => setSelectedProcedureId(procedure.id)}
                              className={`flex w-full items-center gap-1.5 border-b-2 py-1.5 text-left text-xs transition-colors
                                ${selected
                                  ? "border-sky-400 font-semibold text-sky-700 dark:border-sky-500 dark:text-sky-300"
                                  : "border-transparent text-gray-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"}`}
                            >
                              <Plus className={`h-3 w-3 shrink-0 ${selected ? "text-sky-500" : "text-gray-300 dark:text-slate-600"}`} />
                              <span className="truncate">{procedure.nombre}</span>
                              {procedure.cantidad !== null && procedure.cantidad > 1 && (
                                <span className="ml-auto shrink-0 text-[10px] text-gray-400 dark:text-slate-500">
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
                <div className="mt-5 border-gray-100 dark:border-slate-700 sm:mt-0 sm:border-l sm:pl-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                      Material de Apoyo
                    </p>
                    <button
                      type="button"
                      disabled={!selectedProcedure}
                      onClick={() => setMaterialsOpen(true)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300 dark:hover:bg-sky-900/40"
                    >
                      <Plus className="h-3 w-3" />
                      agregar
                    </button>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-gray-400 dark:text-slate-500">
                    Aun no se ha asignado ningun material de apoyo para este procedimiento.
                  </p>

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

          El alto es fijo (400) porque el buscador se abre desplegado: el cuerpo
          necesita espacio para la lista o quedaría recortada. Reparto del alto:
          ~77 de encabezado + 32 de padding + 36 del campo + 4 de margen + 224
          de lista (max-h-56) = 373, con algo de holgura. */}
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
        contentClassName="h-[400px] sm:max-w-xs max-lg:top-auto max-lg:bottom-0 max-lg:translate-y-0 lg:translate-x-[83px]"
        // En móvil entra desde abajo; desde `lg` recupera la entrada centrada.
        // El eje X se mantiene en ambos casos: el fotograma inicial reemplaza el
        // `transform` completo, así que sin él la ventana saltaría a la derecha.
        animationClassName={
          "data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2 " +
          "data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full " +
          "lg:data-[state=open]:slide-in-from-top-[48%] lg:data-[state=closed]:slide-out-to-top-[48%]"
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <button
              type="button"
              disabled={!materialValue}
              title="Agregar material"
              aria-label="Agregar material"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300 dark:hover:bg-sky-900/40"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <SearchableSelect
                options={[]}
                value={materialValue}
                onChange={setMaterialValue}
                placeholder="Buscar material"
                direction="down"
                defaultOpen
                emptyText="No tienes materiales de apoyo en tu inventario"
              />
            </div>
          </div>
        </div>
      </VentanaPopup>
    </div>
  )
}
