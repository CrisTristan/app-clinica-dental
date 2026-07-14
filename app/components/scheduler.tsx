"use client";

import { useState } from "react";
import { Scheduler } from "@aldabil/react-scheduler";
import type { ProcessedEvent, RemoteQuery } from "@aldabil/react-scheduler/types";
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

function App() {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);

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
      `}</style>
      <Scheduler
      events={events}
      locale={es}
      hourFormat="24"
      height={500}
      view="week"
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
        weekDays: [0, 1, 2, 3, 4, 5],
        weekStartOn: 1,
        startHour: 8,
        endHour: 20,
        step: 60,
      }}
      day={{
        startHour: 8,
        endHour: 20,
        step: 30,
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
