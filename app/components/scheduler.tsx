"use client";

import { useState } from "react";
import { Scheduler } from "@aldabil/react-scheduler";
import type { ProcessedEvent, RemoteQuery } from "@aldabil/react-scheduler/types";
import { es } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { onUpdateSomeField } from "../helpers/onUpdateSomeField";
import { toDbTimestamp } from "../helpers/dateTime";
import NewAppointmentWindow from "./newAppointmentWindow";
import {
  STATUS_CONFIG,
  STATUS_OPTIONS,
  normalizeStatus,
  dentistDisplayName,
  type SchedulerEvent,
  type AppointmentStatus,
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
    onUpdateSomeField(undefined, undefined, eventId, newStatus, phone).then(() => {
      setEvents(previous =>
        previous.map(event =>
          event.event_id === eventId
            ? { ...event, status: newStatus, color: STATUS_CONFIG[newStatus].color }
            : event
        )
      );
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
      viewerExtraComponent={(_fields, event) => {
        const schedulerEvent = event as SchedulerEvent;
        const status = normalizeStatus(event.status as string);
        const config = STATUS_CONFIG[status];

        return (
          <div className="mt-2 space-y-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
              {config.label}
            </span>
            {event.description && (
              <p className="text-sm leading-relaxed text-gray-600">{event.description}</p>
            )}
            {schedulerEvent.dentist && (
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Dentista asignado</p>
                <p className="mt-1 text-sm font-medium text-gray-800">{dentistDisplayName(schedulerEvent.dentist)}</p>
                {schedulerEvent.dentist.email && (
                  <p className="text-xs text-gray-500">{schedulerEvent.dentist.email}</p>
                )}
                {schedulerEvent.dentist.phone && (
                  <p className="text-xs text-gray-500">{schedulerEvent.dentist.phone}</p>
                )}
              </div>
            )}
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Servicio programado</p>
              <p className="mt-1 text-sm font-medium text-gray-800">
                {schedulerEvent.serviceName || "Sin servicio"}
              </p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Cambiar estado</p>
              <RadioGroup
                defaultValue={status}
                onValueChange={value =>
                  handleStatusChange(event.event_id, normalizeStatus(value), String(event.description ?? ""))
                }
                className="space-y-1.5"
              >
                {STATUS_OPTIONS.map(option => (
                  <div key={option} className="flex items-center gap-2">
                    <RadioGroupItem value={option} id={`${option}-${event.event_id}`} />
                    <Label
                      htmlFor={`${option}-${event.event_id}`}
                      className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs ${STATUS_CONFIG[option].badge}`}
                    >
                      {STATUS_CONFIG[option].label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );
      }}
    />
  );
}

export default App;
