"use client"

import { useEffect, useState } from "react"
import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  MessageCircleMore,
  Phone,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

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

type CatalogService = {
  id: number
  name: string
  price: number
}

type AppointmentServiceDraft = {
  id?: string | number
  serviceId: number
  serviceName: string
  quantity: number
  unitPrice: number
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

const STATUS_OPTIONS: AppointmentStatus[] = ["Confirmed", "toBeConfirmed", "Cancelled"]

function getStatus(s?: string) {
  return STATUS_CFG[(s ?? "") as AppointmentStatus] ?? STATUS_CFG.toBeConfirmed
}

function initials(name: string, ap?: string | null) {
  return `${name?.[0] ?? ""}${ap?.[0] ?? ""}`.toUpperCase() || "?"
}

function fullPatientName(cita: Cita) {
  return [cita.name.nombre, cita.name.apellido_pat, cita.name.apellido_mat].filter(Boolean).join(" ")
}

function appointmentReminder(cita: Cita) {
  return `Hola ${cita.name.nombre}, le recordamos su cita el ${format(parseISO(cita.startDate), "d 'de' MMMM 'a las' HH:mm", { locale: es })}...`
}

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "")
  return digits.length === 10 ? `52${digits}` : digits
}

export default function CitasDentales({ citas = [] }: { citas?: Cita[] }) {
  const { toast } = useToast()
  const [localCitas, setLocalCitas] = useState<Cita[]>(citas)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [completionOpen, setCompletionOpen] = useState(false)
  const [completionCita, setCompletionCita] = useState<Cita | null>(null)
  const [completionServices, setCompletionServices] = useState<AppointmentServiceDraft[]>([])
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([])
  const [serviceSearch, setServiceSearch] = useState("")
  const [loadingCompletion, setLoadingCompletion] = useState(false)
  const [savingCompletion, setSavingCompletion] = useState(false)

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

  const updateAppointmentStatus = async (cita: Cita, status: AppointmentStatus) => {
    setUpdatingId(cita.id)
    try {
      const response = await fetch("/appointments/api", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cita.id,
          phone: cita.name.telefono,
          status,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || "No se pudo actualizar la cita")
      }

      setLocalCitas(previous =>
        previous.map(item => (item.id === cita.id ? { ...item, status } : item)),
      )
      toast({
        title: "Cita actualizada",
        description: `La cita de ${fullPatientName(cita)} ahora esta ${STATUS_CFG[status].label.toLowerCase()}.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const openCompletionDialog = async (cita: Cita) => {
    setCompletionCita(cita)
    setCompletionOpen(true)
    setCompletionServices([])
    setCatalogServices([])
    setServiceSearch("")
    setLoadingCompletion(true)

    try {
      const response = await fetch(`/appointments/api/${cita.id}/services`)
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(body?.error || "No se pudieron cargar los servicios de la cita")
      }

      setCompletionServices(body.appointmentServices ?? [])
      setCatalogServices(body.catalogServices ?? [])
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
      })
    } finally {
      setLoadingCompletion(false)
    }
  }

  const addCompletionService = (service: CatalogService) => {
    if (!service || completionServices.some(item => item.serviceId === service.id)) return

    setCompletionServices(previous => [
      ...previous,
      {
        serviceId: service.id,
        serviceName: service.name,
        quantity: 1,
        unitPrice: service.price,
      },
    ])
    setServiceSearch("")
  }

  const removeCompletionService = (service: AppointmentServiceDraft) => {
    setCompletionServices(previous =>
      previous.filter(item =>
        service.id
          ? item.id !== service.id
          : item.serviceId !== service.serviceId,
      ),
    )
  }

  const saveCompletedAppointment = async () => {
    if (!completionCita) return

    setSavingCompletion(true)
    try {
      // Este endpoint guarda los servicios realizados de la cita y sincroniza
      // automaticamente los cargos visibles en /servicios-activos.
      const response = await fetch(`/appointments/api/${completionCita.id}/services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: completionServices.map(service => ({
            id: service.id,
            serviceId: service.serviceId,
            quantity: service.quantity,
          })),
        }),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(body?.error || "No se pudo completar la cita")
      }

      setLocalCitas(previous =>
        previous.map(item =>
          item.id === completionCita.id ? { ...item, status: "Completed" } : item,
        ),
      )
      setCompletionServices(body?.services ?? completionServices)
      setCompletionOpen(false)
      toast({
        title: completionCita.status === "Completed" ? "Servicios actualizados" : "Cita completada",
        description: completionCita.status === "Completed"
          ? "Los servicios de la cita completada quedaron guardados."
          : "Los servicios realizados quedaron guardados.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
      })
    } finally {
      setSavingCompletion(false)
    }
  }

  const sendMessage = async (telefono: string, nombre: string) => {
    if (!message.trim()) return
    setSending(true)
    try {
      const url = `https://wa.me/${whatsappNumber(telefono)}?text=${encodeURIComponent(message.trim())}`
      window.open(url, "_blank", "noopener,noreferrer")
      toast({ title: "WhatsApp abierto", description: `Chat iniciado con ${nombre}` })
      setMessage("")
    } catch {
      toast({ title: "Error", description: "No se pudo abrir WhatsApp" })
    } finally {
      setSending(false)
    }
  }

  const availableCatalogServices = catalogServices.filter(service =>
    !completionServices.some(item => item.serviceId === service.id),
  )
  const normalizedServiceSearch = serviceSearch.trim().toLocaleLowerCase("es")
  const filteredCatalogServices = availableCatalogServices
    .filter(service =>
      service.name.toLocaleLowerCase("es").includes(normalizedServiceSearch),
    )
    .slice(0, 8)
  const completionTotal = completionServices.reduce(
    (sum, service) => sum + service.unitPrice * service.quantity,
    0,
  )
  const editingCompletedAppointment = completionCita?.status === "Completed"

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
              const isUpdating = updatingId === cita.id
              const isCompleted = cita.status === "Completed"

              return (
                <div
                  key={cita.id}
                  className="flex flex-col gap-4 rounded-xl border border-gray-100 px-4 py-4 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50 sm:flex-row sm:items-start"
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

                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400 dark:text-slate-500 shrink-0" />
                        <span className="text-xs text-gray-400 dark:text-slate-500">{cita.name.telefono}</span>
                      </div>

                      {appointmentText && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {appointmentText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      disabled={isUpdating}
                      onClick={() => openCompletionDialog(cita)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isCompleted ? "Editar servicios" : "Completar"}
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          Estado
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {STATUS_OPTIONS.map(option => {
                          const optionCfg = STATUS_CFG[option]
                          return (
                            <DropdownMenuItem
                              key={option}
                              onClick={() => updateAppointmentStatus(cita, option)}
                              className="cursor-pointer"
                            >
                              <span className={`h-2 w-2 rounded-full ${optionCfg.dot}`} />
                              {optionCfg.label}
                            </DropdownMenuItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog onOpenChange={open => setMessage(open ? appointmentReminder(cita) : "")}>
                      <DialogTrigger asChild>
                        <button className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40">
                          <MessageCircleMore className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700">
                        <DialogHeader>
                          <DialogTitle className="text-gray-800 dark:text-slate-100 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                              <MessageCircleMore className="w-4 h-4 text-white" />
                            </div>
                            Mensaje a {cita.name.nombre}
                          </DialogTitle>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            Envia un recordatorio de cita a {fullPatientName(cita)}
                          </p>
                        </DialogHeader>

                        <div className="space-y-3 pt-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            {cita.name.telefono}
                          </div>
                          <Textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder={`Escribe un mensaje a ${fullPatientName(cita)}`}
                            className="min-h-[100px] text-sm resize-none"
                          />
                          <button
                            disabled={!message.trim() || sending}
                            onClick={() => sendMessage(cita.name.telefono, cita.name.nombre)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
                          >
                            <Send className="w-4 h-4" />
                            {sending ? "Enviando..." : "Enviar WhatsApp"}
                          </button>
                        </div>
                      </DialogContent>
                    </Dialog>
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

      <Dialog
        open={completionOpen}
        onOpenChange={open => {
          setCompletionOpen(open)
          if (!open) {
            setCompletionCita(null)
            setServiceSearch("")
          }
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              {editingCompletedAppointment ? "Editar servicios" : "Completar cita"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-500">
                {editingCompletedAppointment
                  ? "Edita los servicios registrados para esta cita completada."
                  : "¿Se realizo algun servicio durante la cita?"}
              </p>
              {completionCita && (
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                  Paciente: {fullPatientName(completionCita)}
                </p>
              )}
            </div>

            {loadingCompletion ? (
              <div className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando servicios...
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      Servicios realizados
                    </p>
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-300">
                      ${completionTotal.toLocaleString("es-MX")}
                    </span>
                  </div>

                  {completionServices.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-center text-xs text-gray-400 dark:border-slate-700 dark:text-slate-500">
                      No hay servicios registrados para esta cita.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {completionServices.map(service => (
                        <div
                          key={service.id ? `appointment-service-${service.id}` : `catalog-service-${service.serviceId}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-slate-700"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800 dark:text-slate-100">
                              {service.serviceName}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-slate-500">
                              ${service.unitPrice.toLocaleString("es-MX")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCompletionService(service)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                            aria-label={`Eliminar ${service.serviceName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                    Agregar otro servicio
                  </p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                    <input
                      value={serviceSearch}
                      onChange={event => setServiceSearch(event.target.value)}
                      placeholder="Buscar servicio por nombre"
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-100 dark:border-slate-700">
                    {availableCatalogServices.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-slate-500">
                        Todos los servicios del catalogo ya estan agregados.
                      </div>
                    ) : filteredCatalogServices.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-slate-500">
                        No se encontraron servicios con esa busqueda.
                      </div>
                    ) : (
                      filteredCatalogServices.map(service => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => addCompletionService(service)}
                          className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-sky-50 dark:border-slate-700 dark:hover:bg-slate-700/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-gray-800 dark:text-slate-100">
                              {service.name}
                            </span>
                            <span className="block text-xs text-gray-400 dark:text-slate-500">
                              ${service.price.toLocaleString("es-MX")}
                            </span>
                          </span>
                          <span
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white"
                            aria-hidden="true"
                          >
                            <Plus className="h-4 w-4" />
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  {availableCatalogServices.length > filteredCatalogServices.length && (
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      Mostrando {filteredCatalogServices.length} de {availableCatalogServices.length}. Escribe para filtrar la lista.
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-slate-700">
              <button
                type="button"
                disabled={savingCompletion}
                onClick={() => setCompletionOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loadingCompletion || savingCompletion}
                onClick={saveCompletedAppointment}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingCompletion && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingCompletedAppointment ? "Guardar cambios" : "Guardar y completar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
