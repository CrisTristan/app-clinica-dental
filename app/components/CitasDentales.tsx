"use client"

import { useState } from "react"
import { format, parseISO, addDays, subDays, startOfWeek, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, MessageCircleMore, Send, Calendar, Clock, Phone } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

type Cita = {
  id: string
  desc: string
  startDate: string
  endDate: string
  status?: string
  nameId: number
  name: {
    id: number
    name: string
    apellido_pat: string
    apellido_mat: string
    telefono: string
    edad: number | null
    domicilio: string | null
    sexo: string | null
  }
}

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  Confirmed:     { label: "Confirmada",    dot: "bg-green-500",  badge: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"  },
  toBeConfirmed: { label: "Por confirmar", dot: "bg-yellow-400", badge: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" },
  Cancelled:     { label: "Cancelada",     dot: "bg-red-500",    badge: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"    },
}

function getStatus(s?: string) {
  return STATUS_CFG[s ?? ""] ?? STATUS_CFG.toBeConfirmed
}

function initials(name: string, ap?: string | null) {
  return `${name?.[0] ?? ""}${ap?.[0] ?? ""}`.toUpperCase() || "?"
}

export default function CitasDentales({ citas = [] }: { citas?: Cita[] }) {
  const { toast } = useToast()
  const [currentDay, setCurrentDay] = useState(new Date())
  const [message,    setMessage]    = useState("")
  const [sending,    setSending]    = useState(false)

  /* ── Week strip (Mon–Sat starting from this week) ── */
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekDays  = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))

  const countForDay = (day: Date) =>
    citas.filter(c => isSameDay(parseISO(c.startDate), day)).length

  /* ── Filter by selected day ── */
  const citasDelDia = citas
    .filter(c => isSameDay(parseISO(c.startDate), currentDay))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  /* ── Send WhatsApp ── */
  const sendMessage = async (telefono: string, nombre: string) => {
    if (!message.trim()) return
    setSending(true)
    try {
      await fetch("/api/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: telefono, message }),
      })
      toast({ title: "Mensaje enviado", description: `WhatsApp enviado a ${nombre}` })
      setMessage("")
    } catch {
      toast({ title: "Error", description: "No se pudo enviar el mensaje" })
    } finally {
      setSending(false)
    }
  }

  const today       = new Date()
  const isToday     = isSameDay(currentDay, today)
  const dayLabel    = isToday
    ? "Hoy"
    : format(currentDay, "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="space-y-5">

      {/* ── Stats row ── */}
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
            {weekDays.reduce((s, d) => s + countForDay(d), 0)}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500">citas</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3.5 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide font-medium">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-500 mt-0.5">
            {citas.filter(c => !c.status || c.status === "toBeConfirmed").length}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500">por confirmar</p>
        </div>
      </div>

      {/* ── Week strip ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Semana actual</p>
        <div className="grid grid-cols-6 gap-1.5">
          {weekDays.map(day => {
            const active  = isSameDay(day, currentDay)
            const isHoy   = isSameDay(day, today)
            const count   = countForDay(day)
            return (
              <button
                key={day.toISOString()}
                onClick={() => setCurrentDay(day)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all
                  ${active
                    ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md"
                    : "hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400"
                  }`}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${active ? "text-sky-100" : "text-gray-400 dark:text-slate-500"}`}>
                  {format(day, "EEE", { locale: es })}
                </span>
                <span className={`text-base font-bold ${isHoy && !active ? "text-sky-500" : ""}`}>
                  {format(day, "d")}
                </span>
                {count > 0 ? (
                  <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center
                    ${active ? "bg-white/25 text-white" : "bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400"}`}>
                    {count}
                  </span>
                ) : (
                  <span className="w-5 h-5" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Day navigator + list ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">

        {/* Day header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-slate-700">
          <button
            onClick={() => setCurrentDay(d => subDays(d, 1))}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <p className="text-sm font-bold text-gray-800 dark:text-slate-100 capitalize">{dayLabel}</p>
            {!isToday && (
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {format(currentDay, "d 'de' MMMM yyyy", { locale: es })}
              </p>
            )}
          </div>

          <button
            onClick={() => setCurrentDay(d => addDays(d, 1))}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Appointment list */}
        <div className="divide-y divide-gray-50 dark:divide-slate-700">
          {citasDelDia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-gray-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Sin citas para este día</p>
              <button
                onClick={() => setCurrentDay(new Date())}
                className="mt-2 text-xs text-sky-500 hover:text-sky-600 dark:text-sky-400 transition-colors"
              >
                Volver a hoy
              </button>
            </div>
          ) : (
            citasDelDia.map(cita => {
              const st  = getStatus(cita.status)
              const ini = initials(cita.name.name, cita.name.apellido_pat)
              const fullName = [cita.name.name, cita.name.apellido_pat].filter(Boolean).join(" ")

              return (
                <div key={cita.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">

                  {/* Time column */}
                  <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5 min-w-[48px]">
                    <Clock className="w-3 h-3 text-sky-400 mb-0.5" />
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                      {format(parseISO(cita.startDate), "HH:mm")}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">
                      {format(parseISO(cita.endDate), "HH:mm")}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 grid place-items-center text-white text-sm font-bold overflow-hidden">
                    <span className="leading-none">{ini}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{fullName}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-gray-400 dark:text-slate-500 shrink-0" />
                      <span className="text-xs text-gray-400 dark:text-slate-500">{cita.name.telefono}</span>
                    </div>

                    {cita.desc && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {cita.desc}
                      </p>
                    )}
                  </div>

                  {/* WhatsApp button */}
                  <Dialog onOpenChange={() => setMessage("")}>
                    <DialogTrigger asChild>
                      <button className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                                         text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20
                                         border border-green-200 dark:border-green-800 rounded-lg
                                         hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
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
                          Mensaje a {cita.name.name}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-3 pt-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          {cita.name.telefono}
                        </div>
                        <Textarea
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          placeholder={`Hola ${cita.name.name}, le recordamos su cita el ${format(parseISO(cita.startDate), "d 'de' MMMM 'a las' HH:mm", { locale: es })}…`}
                          className="min-h-[100px] text-sm resize-none"
                        />
                        <button
                          disabled={!message.trim() || sending}
                          onClick={() => sendMessage(cita.name.telefono, cita.name.name)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white
                                     bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed
                                     rounded-xl transition-colors shadow-sm"
                        >
                          <Send className="w-4 h-4" />
                          {sending ? "Enviando…" : "Enviar WhatsApp"}
                        </button>
                      </div>
                    </DialogContent>
                  </Dialog>

                </div>
              )
            })
          )}
        </div>

        {/* Footer count */}
        {citasDelDia.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30">
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
              {citasDelDia.length} {citasDelDia.length === 1 ? "cita" : "citas"} el {isToday ? "día de hoy" : format(currentDay, "d 'de' MMMM", { locale: es })}
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
