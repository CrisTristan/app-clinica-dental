import { NextRequest } from "next/server"

import { requireAdmin, requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { AGENDA_DEFAULTS, type AgendaConfig, type AgendaView } from "@/lib/agenda-config"

// Configuracion global de la agenda (tabla agenda_config, fila unica 'global').
//
//   GET /api/agenda-config  -> cualquier rol con acceso a la agenda
//   PUT /api/agenda-config  -> solo admin
//
// El cliente trabaja con horas enteras (0..24) porque el scheduler solo acepta
// eso; en la base se guardan como `time` ('08:00:00').

const CONFIG_ID = "global"

const VIEWS = ["month", "week", "day"] as const
const HOUR_FORMATS = [12, 24] as const
const INTERVALS = [15, 30, 60] as const

const DEFAULTS = AGENDA_DEFAULTS

type ConfigRow = {
  default_view?: string | null
  hour_format?: number | null
  days_week?: number[] | null
  start_day_week?: number | null
  start_hour?: string | null
  end_hour?: string | null
  time_interval?: number | null
}

// '08:00:00' -> 8. La columna solo admite horas exactas (check en el SQL).
const timeToHour = (value?: string | null, fallback = 0) => {
  const hour = Number(value?.split(":")[0])
  return Number.isInteger(hour) && hour >= 0 && hour <= 24 ? hour : fallback
}

const hourToTime = (hour: number) => `${String(hour).padStart(2, "0")}:00:00`

const isDayIndex = (d: unknown): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6

function toClientConfig(row?: ConfigRow | null): AgendaConfig {
  if (!row) return DEFAULTS
  return {
    defaultView: VIEWS.includes(row.default_view as AgendaView) ? (row.default_view as AgendaView) : DEFAULTS.defaultView,
    hourFormat: row.hour_format === 12 ? 12 : 24,
    daysWeek: Array.isArray(row.days_week) && row.days_week.length ? row.days_week : DEFAULTS.daysWeek,
    startDayWeek: Number.isInteger(row.start_day_week) ? Number(row.start_day_week) : DEFAULTS.startDayWeek,
    startHour: timeToHour(row.start_hour, DEFAULTS.startHour),
    endHour: timeToHour(row.end_hour, DEFAULTS.endHour),
    timeInterval: INTERVALS.includes(row.time_interval as 15 | 30 | 60)
      ? (row.time_interval as 15 | 30 | 60)
      : DEFAULTS.timeInterval,
  }
}

const SELECT = "default_view, hour_format, days_week, start_day_week, start_hour, end_hour, time_interval"

export async function GET() {
  const auth = await requireRole(rolesFor("agenda"))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("agenda_config")
    .select(SELECT)
    .eq("id", CONFIG_ID)
    .maybeSingle()

  // Si la migracion agenda_config.sql aun no se ejecuto, la agenda sigue viva
  // con los valores por defecto en vez de romperse.
  if (error) {
    if (error.code === "42P01") return Response.json({ config: DEFAULTS })
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ config: toClientConfig(data) })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()

  const defaultView = VIEWS.includes(body.defaultView) ? (body.defaultView as AgendaView) : null
  if (!defaultView) return Response.json({ error: "Vista predeterminada no valida." }, { status: 400 })

  const hourFormat = HOUR_FORMATS.includes(body.hourFormat) ? body.hourFormat : null
  if (!hourFormat) return Response.json({ error: "Formato de hora no valido." }, { status: 400 })

  const timeInterval = INTERVALS.includes(body.timeInterval) ? body.timeInterval : null
  if (!timeInterval) return Response.json({ error: "Intervalo de tiempo no valido." }, { status: 400 })

  const rawDays: unknown[] = Array.isArray(body.daysWeek) ? body.daysWeek : []
  const daysWeek = Array.from(new Set<number>(rawDays.filter(isDayIndex))).sort((a, b) => a - b)
  if (!daysWeek.length) {
    return Response.json({ error: "Selecciona al menos un dia de la semana." }, { status: 400 })
  }

  const startDayWeek = body.startDayWeek
  if (!Number.isInteger(startDayWeek) || startDayWeek < 0 || startDayWeek > 6) {
    return Response.json({ error: "Dia de inicio de semana no valido." }, { status: 400 })
  }

  const startHour = body.startHour
  const endHour = body.endHour
  const validHour = (h: unknown) => Number.isInteger(h) && (h as number) >= 0 && (h as number) <= 24
  if (!validHour(startHour) || !validHour(endHour)) {
    return Response.json({ error: "Las horas deben ser enteras entre 0 y 24." }, { status: 400 })
  }
  if (endHour <= startHour) {
    return Response.json({ error: "La hora de fin debe ser posterior a la de inicio." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("agenda_config")
    .upsert(
      {
        id: CONFIG_ID,
        default_view: defaultView,
        hour_format: hourFormat,
        days_week: daysWeek,
        start_day_week: startDayWeek,
        start_hour: hourToTime(startHour),
        end_hour: hourToTime(endHour),
        time_interval: timeInterval,
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select(SELECT)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ config: toClientConfig(data) })
}
