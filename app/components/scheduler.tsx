"use client";

import { useState } from "react";
import { Scheduler } from "@aldabil/react-scheduler";
import type { DayHours, ProcessedEvent, RemoteQuery } from "@aldabil/react-scheduler/types";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { onUpdateSomeField } from "../helpers/onUpdateSomeField";
import { toDbTimestamp } from "../helpers/dateTime";
import NewAppointmentWindow from "./newAppointmentWindow";
import AppointmentViewer from "./appointmentViewer";
import {
  STATUS_CONFIG,
  normalizeStatus,
  type SchedulerEvent,
  type AppointmentStatus,
  type DentistOption,
  type AppointmentProcedure,
} from "./schedulerShared";
import { AGENDA_DEFAULTS, type AgendaConfig } from "@/lib/agenda-config";

type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/*
  OJO: `weekDays` NO son índices absolutos de día para la librería, son
  desplazamientos desde el inicio de la semana. Internamente hace:

    weekDays.map(d => addDays(startOfWeek(fecha, { weekStartsOn }), d))

  Es decir, con weekStartOn = 1 (lunes), el 0 significa lunes y el 6 domingo.
  La configuración guarda días absolutos (0 = domingo), que es independiente de
  dónde inicie la semana, así que hay que convertirlos aquí. Sin esta
  conversión, deseleccionar el domingo borraba el lunes.

  El orden ascendente importa: la librería toma el primero y el último del
  arreglo para calcular el rango de fechas que muestra.
*/
const toWeekOffsets = (days: number[], weekStartOn: number): WeekDay[] =>
  days
    .map((day) => (((day - weekStartOn + 7) % 7) as WeekDay))
    .sort((a, b) => a - b);

function App({ config = AGENDA_DEFAULTS }: { config?: AgendaConfig }) {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);

  const weekStartOn = config.startDayWeek as WeekDay;
  const weekDays = toWeekOffsets(config.daysWeek, config.startDayWeek);
  const startHour = config.startHour as DayHours;
  const endHour = config.endHour as DayHours;

  const fetchRemoteData = async (_query: RemoteQuery): Promise<ProcessedEvent[]> => {
    const response = await fetch("/appointments/api");
    if (!response.ok) throw new Error("Error al cargar citas");
    const data = await response.json();

    const formatted: SchedulerEvent[] = data.map((appointment: any) => {
      const appointmentService = appointment.appointmentService;
      const serviceName = appointmentService?.serviceName ?? null;
      const reason = appointment.reason || "Sin motivo";

      return {
        event_id: appointment.id,
        title: [appointment.name.nombre, appointment.name.apellido_pat, appointment.name.apellido_mat]
          .filter(Boolean)
          .join(" "),
        description: appointment.name.telefono,
        // El scheduler usa subtitle, pero ahora se alimenta desde Appointment.reason.
        subtitle: reason,
        status: appointment.status,
        color: STATUS_CONFIG[normalizeStatus(appointment.status)].color,
        start: new Date(appointment.startDate),
        end: new Date(appointment.endDate),
        dentistId: appointment.dentistId,
        dentist: appointment.dentist,
        serviceId: appointmentService?.serviceId ?? null,
        serviceName,
        unitPrice: appointmentService?.unitPrice ?? 0,
        reason,
        procedures: appointment.procedures ?? [],
      };
    });

    setEvents(formatted);
    return formatted;
  };

  const handleStatusChange = (
    eventId: number | string,
    newStatus: AppointmentStatus,
    phone: number | string,
  ) => {
    // Actualización optimista: reflejamos el nuevo estado/color en el calendario de
    // inmediato y luego persistimos en el backend. Si la petición falla, revertimos.
    let previousEvents: ProcessedEvent[] = [];
    setEvents(previous => {
      previousEvents = previous;
      return previous.map(event =>
        event.event_id === eventId
          ? { ...event, status: newStatus, color: STATUS_CONFIG[newStatus].color }
          : event
      );
    });

    onUpdateSomeField(undefined, undefined, eventId, newStatus, phone).catch(error => {
      console.error("No se pudo actualizar el estado de la cita:", error);
      setEvents(previousEvents);
    });
  };

  // Edición desde el visor de detalles (motivo, dentista y orden de
  // procedimientos). Actualiza el calendario de inmediato, persiste en el
  // backend y avisa con un toast; si falla, revierte.
  const handleAppointmentSave = (
    eventId: number | string,
    patch: {
      reason: string;
      dentistId: string;
      dentist: DentistOption | null;
      procedures: AppointmentProcedure[];
    },
  ) => {
    let previousEvents: ProcessedEvent[] = [];
    setEvents(previous => {
      previousEvents = previous;
      return previous.map(event =>
        event.event_id === eventId
          ? {
              ...event,
              reason: patch.reason,
              subtitle: patch.reason,
              dentistId: patch.dentistId,
              dentist: patch.dentist,
              procedures: patch.procedures,
            }
          : event
      );
    });

    fetch("/appointments/api", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: eventId,
        reason: patch.reason,
        dentistId: patch.dentistId,
        procedures: patch.procedures,
      }),
    })
      .then(async response => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "No se pudo actualizar la cita");
        }
        toast({ title: "Cita actualizada con éxito" });
      })
      .catch(error => {
        setEvents(previousEvents);
        toast({ title: "Error al actualizar la cita", description: (error as Error).message });
      });
  };

  // La nota se guarda de forma independiente (disponible también fuera de la
  // edición) en Appointment.notas.
  const handleNoteSave = (eventId: number | string, note: string) => {
    let previousEvents: ProcessedEvent[] = [];
    setEvents(previous => {
      previousEvents = previous;
      return previous.map(event =>
        event.event_id === eventId ? { ...event, note } : event
      );
    });

    fetch("/appointments/api", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: eventId, notas: note }),
    })
      .then(async response => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "No se pudo guardar la nota");
        }
        toast({ title: "Nota agregada a la cita" });
      })
      .catch(error => {
        setEvents(previousEvents);
        toast({ title: "Error al guardar la nota", description: (error as Error).message });
      });
  };

  const onEventDrop = async (
    _event: React.DragEvent<HTMLButtonElement>,
    droppedOn: Date,
    updatedEvent: ProcessedEvent,
    originalEvent: ProcessedEvent,
  ): Promise<ProcessedEvent | void> => {
    const duration = originalEvent.end.getTime() - originalEvent.start.getTime();
    const newEnd = new Date(droppedOn.getTime() + duration);

    await fetch("/appointments/api", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updatedEvent.event_id,
        name: updatedEvent.name,
        phone: updatedEvent.description,
        startDate: toDbTimestamp(droppedOn),
        endDate: toDbTimestamp(newEnd),
      }),
    });

    setEvents(previous =>
      previous.map(event =>
        event.event_id === originalEvent.event_id
          ? { ...event, start: droppedOn, end: newEnd }
          : event
      )
    );
    return updatedEvent;
  };

  const onDelete = async (deletedId: string | number): Promise<void> => {
    await fetch("/appointments/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deletedId }),
    });
    setEvents(previous => previous.filter(event => event.event_id !== deletedId));
  };

  return (
    <div className="scheduler-wrapper">
      {/*
        El encabezado de @aldabil/react-scheduler agrupa todos los botones
        (Hoy, Agenda, Mes, Semana, Día) dentro de .rs__view_navigator, a la
        derecha de las flechas de fecha. Aplanamos ese contenedor con
        display:contents para que sus botones participen del flex del
        encabezado y así redistribuirlos: Hoy junto a las flechas, Agenda
        centrado y las vistas a la derecha.
      */}
      <style>{`
        /* Los encabezados sticky del scheduler (fecha y horarios) usan un
           z-index alto (99, y la barra de navegación interna 999). Sin un
           contexto de apilamiento propio, en vista "día" al hacer scroll se
           pintaban por encima del navbar (sticky, z-50). Creamos un contexto
           en z-index 0 para confinar todo su contenido por debajo del navbar. */
        .scheduler-wrapper {
          position: relative;
          z-index: 0;
        }
        /* Los eventos quedaban descuadrados hacia abajo, y el desfase crecía
           conforme avanzaba el día. La librería posiciona cada evento con:

             top = minutos * minuteHeight + minutos / step

           Ese segundo término suma 1px por cada celda cruzada, porque asume que
           una celda ocupa su height MÁS 1px de borde, es decir el box-sizing
           content-box que trae el navegador por defecto. El preflight de
           Tailwind pone box-sizing: border-box en todos los elementos, así
           que el borde pasa a contar DENTRO del alto y cada fila mide 60px en
           vez de 61: la compensación sobra y el evento cae 1px por celda
           (20px a las 18:00 con inicio 8:00 y paso de 30 min).

           Devolvemos content-box a las celdas para que la fila vuelva a medir
           lo que la librería calcula. Sólo afecta el alto: el ancho lo definen
           las columnas del grid (1fr), no la caja de la celda. */
        .scheduler-wrapper .rs__cell {
          box-sizing: content-box;
        }
        .scheduler-wrapper .MuiPaper-root:has(> .rs__view_navigator) {
          position: relative;
          justify-content: flex-start;
        }
        .scheduler-wrapper .rs__view_navigator {
          display: contents;
        }
        /* Flechas + fecha primero */
        .scheduler-wrapper [data-testid="date-navigator"] {
          order: 1;
        }
        /* "Hoy" justo a la derecha de las flechas */
        .scheduler-wrapper .rs__view_navigator > button[aria-label="Hoy"] {
          order: 2;
        }
        /* "Agenda" centrado horizontalmente en el encabezado */
        .scheduler-wrapper .rs__view_navigator > button[aria-label="Agenda"] {
          order: 3;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
        /* "Mes", "Semana", "Día" agrupados a la derecha */
        .scheduler-wrapper .rs__view_navigator > button:not([aria-label]) {
          order: 4;
        }
        .scheduler-wrapper .rs__view_navigator > button[aria-label="Agenda"] + button {
          margin-left: auto;
        }
        /* En móvil la librería colapsa Agenda y las vistas a iconos: repartimos
           los 4 elementos (fecha, Hoy, Agenda, menú) de forma uniforme. */
        @media (max-width: 600px) {
          .scheduler-wrapper .MuiPaper-root:has(> .rs__view_navigator) {
            justify-content: space-between;
          }
        }
      `}</style>
      <Scheduler
      events={events}
      locale={es}
      hourFormat={String(config.hourFormat) as "12" | "24"}
      height={500}
      view={config.defaultView}
      getRemoteEvents={fetchRemoteData}
      onEventDrop={onEventDrop}
      onDelete={onDelete}
      dialogMaxWidth="xs"
      translations={{
        navigation: { month: "Mes", week: "Semana", day: "Día", today: "Hoy", agenda: "Agenda" },
        form: { addTitle: "Nueva cita", editTitle: "Editar cita", confirm: "Confirmar", delete: "Eliminar", cancel: "Cancelar" },
        event: { title: "Paciente", subtitle: "Motivo", start: "Inicio", end: "Fin", allDay: "Todo el día" },
        moreEvents: "más...",
        noDataToDisplay: "Sin citas registradas",
        loading: "Cargando...",
      }}
      week={{
        weekDays,
        weekStartOn,
        startHour,
        endHour,
        step: config.timeInterval,
      }}
      day={{
        startHour,
        endHour,
        step: config.timeInterval,
      }}
      // Sin esto la vista de mes usa los defaults de la librería
      // (weekStartOn: 6 = sábado, los 7 días) e ignora la configuración.
      month={{
        weekDays,
        weekStartOn,
        startHour,
        endHour,
      }}
      customEditor={scheduler => <NewAppointmentWindow scheduler={scheduler} setEvents={setEvents} />}
      customViewer={(event, close) => (
        <AppointmentViewer
          event={event as SchedulerEvent}
          close={close}
          onStatusChange={handleStatusChange}
          onDelete={onDelete}
          onSave={handleAppointmentSave}
          onNoteSave={handleNoteSave}
        />
      )}
      />
    </div>
  );
}

export default App;
