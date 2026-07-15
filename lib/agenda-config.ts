// Configuracion de la agenda compartida por el API, el drawer de ajustes y el
// scheduler. Fuente de verdad del tipo y de los valores por defecto.

export type AgendaView = "month" | "week" | "day"

export type AgendaConfig = {
  defaultView: AgendaView
  hourFormat: 12 | 24
  /** Dias visibles en la vista semanal. 0 = domingo ... 6 = sabado. */
  daysWeek: number[]
  /** Primer dia de la semana. 0 = domingo, 1 = lunes. */
  startDayWeek: number
  /** Horas enteras 0..24: es lo unico que acepta el scheduler. */
  startHour: number
  endHour: number
  timeInterval: 15 | 30 | 60
}

// Espejo de los defaults de supabase/agenda_config.sql y de los valores que
// estaban fijos en scheduler.tsx. Se usan como respaldo si la tabla aun no
// existe o si la peticion falla.
export const AGENDA_DEFAULTS: AgendaConfig = {
  defaultView: "week",
  hourFormat: 24,
  daysWeek: [0, 1, 2, 3, 4, 5, 6],
  startDayWeek: 1,
  startHour: 8,
  endHour: 20,
  timeInterval: 60,
}
