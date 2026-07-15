'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Drawer, DrawerContent, DrawerDescription, DrawerFooter,
  DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { AGENDA_DEFAULTS, type AgendaConfig } from '@/lib/agenda-config'

// Configuracion global de la agenda. Escribe en la tabla agenda_config vía
// /api/agenda-config (solo admin).

const DEFAULTS = AGENDA_DEFAULTS

// Valor = indice que usa el scheduler (0 = domingo); el orden del arreglo es el
// que se muestra en pantalla (lunes primero).
const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

// El scheduler sólo acepta horas enteras, así que cada opción es una hora en
// punto. La etiqueta sigue el formato elegido: "20:00" o "8:00 PM".
const hourLabel = (hour: number, format: 12 | 24) => {
  if (format === 24) return `${String(hour).padStart(2, '0')}:00`
  if (hour === 24) return '12:00 AM (fin del día)'
  const suffix = hour < 12 ? 'AM' : 'PM'
  return `${hour % 12 || 12}:00 ${suffix}`
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

export default function AgendaConfigDrawer({
  open, onOpenChange, onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (config: AgendaConfig) => void
}) {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [form, setForm] = useState<AgendaConfig>(DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Carga la configuración vigente cada vez que se abre el drawer.
  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/agenda-config')
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? `Error ${r.status}`)
        return data
      })
      .then((data: { config: AgendaConfig }) => setForm(data.config))
      .catch(err => toast({ title: 'Error', description: err.message ?? 'No se pudo cargar la configuración.' }))
      .finally(() => setLoading(false))
  }, [open, toast])

  const toggleDay = (day: number) =>
    setForm(prev => ({
      ...prev,
      daysWeek: prev.daysWeek.includes(day)
        ? prev.daysWeek.filter(d => d !== day)
        : [...prev.daysWeek, day].sort(),
    }))

  const noDays = form.daysWeek.length === 0
  const badRange = form.endHour <= form.startHour
  const canSubmit = !loading && !saving && !noDays && !badRange

  const handleSave = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const res = await fetch('/api/agenda-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)

      onSaved?.(data.config)
      onOpenChange(false)
      toast({ title: 'Configuración guardada', description: 'La agenda se actualizó correctamente.' })
    } catch (err: any) {
      toast({ title: 'Error al guardar', description: err.message ?? 'Intenta de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    // En móvil se desliza desde abajo con manija; en escritorio entra como
    // panel lateral, donde una manija de arrastre no aporta nada.
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
      <DrawerContent showSwipeHandle={isMobile}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden">
          <DrawerHeader className="shrink-0">
            <DrawerTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-sky-500" />
              Configuración de Agenda
            </DrawerTitle>
            <DrawerDescription>
              Ajustes globales del calendario de citas para toda la clínica.
            </DrawerDescription>
          </DrawerHeader>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            /* min-h-0 es lo que permite que este bloque scrollee dentro del flex. */
            <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-5 pb-2">
              {/* Vista predeterminada */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-slate-400">Vista predeterminada</Label>
                <Select
                  value={form.defaultView}
                  onValueChange={(v: AgendaConfig['defaultView']) => setForm(p => ({ ...p, defaultView: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Mes</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="day">Día</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Formato de la hora */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-slate-400">Formato de la hora</Label>
                <Select
                  value={String(form.hourFormat)}
                  onValueChange={v => setForm(p => ({ ...p, hourFormat: Number(v) as 12 | 24 }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 horas (AM/PM)</SelectItem>
                    <SelectItem value="24">24 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Días de la semana (selección múltiple) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-slate-400">Días de la semana</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(d => {
                    const active = form.daysWeek.includes(d.value)
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        aria-pressed={active}
                        className={`w-11 h-9 rounded-lg text-xs font-semibold border transition-colors
                          ${active
                            ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-transparent shadow-sm'
                            : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-700'
                          }`}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
                {noDays && (
                  <p className="text-xs text-red-500 dark:text-red-400">Selecciona al menos un día.</p>
                )}
              </div>

              {/* Día en que inicia la semana (selección única) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-slate-400">La semana inicia en</Label>
                <Select
                  value={String(form.startDayWeek)}
                  onValueChange={v => setForm(p => ({ ...p, startDayWeek: Number(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map(d => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rango horario */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500 dark:text-slate-400">Hora de inicio</Label>
                  <Select
                    value={String(form.startHour)}
                    onValueChange={v => setForm(p => ({ ...p, startHour: Number(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {range(0, 23).map(h => (
                        <SelectItem key={h} value={String(h)}>{hourLabel(h, form.hourFormat)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500 dark:text-slate-400">Hora de fin</Label>
                  <Select
                    value={String(form.endHour)}
                    onValueChange={v => setForm(p => ({ ...p, endHour: Number(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {range(1, 24).map(h => (
                        <SelectItem key={h} value={String(h)}>{hourLabel(h, form.hourFormat)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {badRange && (
                <p className="text-xs text-red-500 dark:text-red-400 -mt-3">
                  La hora de fin debe ser posterior a la de inicio.
                </p>
              )}

              {/* Intervalo de tiempo */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-slate-400">Intervalo de tiempo</Label>
                <Select
                  value={String(form.timeInterval)}
                  onValueChange={v => setForm(p => ({ ...p, timeInterval: Number(v) as 15 | 30 | 60 }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">60 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DrawerFooter className="shrink-0 flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!canSubmit}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Guardar
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
