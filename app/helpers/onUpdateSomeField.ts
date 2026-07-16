import { ProcessedEvent } from "@aldabil/react-scheduler/types";
import {Appointment} from "../types/types"
import { toDbTimestamp } from "./dateTime";

type AppointmentStatus = "Confirmed" | "toBeConfirmed" | "Cancelled" | "Completed";
type AppointmentUpdateState = Partial<Appointment> & {
    name?: string;
    reason?: string;
    dentistId?: string;
    serviceId?: number | null;
    phone?: string | number;
};

const isAppointmentStatus = (status?: string): status is AppointmentStatus =>
  status === "Confirmed" || status === "toBeConfirmed" || status === "Cancelled" || status === "Completed";

export const onUpdateSomeField = async(event?: ProcessedEvent, state? : AppointmentUpdateState, eventId?: number | string, newStatus?: string, phone?: number | string)=>{
    const payload: Record<string, unknown> = {
        "id": event?.event_id || eventId,
        "name": state?.name,
        "reason": state?.reason,
        "dentistId": state?.dentistId,
        "serviceId": state?.serviceId,
        "phone": state?.phone || phone,
        "startDate": event?.start ? toDbTimestamp(event.start) : undefined,
        "endDate": event?.end ? toDbTimestamp(event.end) : undefined
    };

    if (isAppointmentStatus(newStatus)) {
        payload.status = newStatus;
    }

    return fetch('/appointments/api', {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(async response => {
          if (!response.ok) {
            // La API explica por qué rechazó el cambio (horario invertido, dentista
            // inválido…); ese texto es el que la ventana de la cita muestra.
            const body = await response.json().catch(() => null);
            throw new Error(body?.error || 'No se pudo actualizar la cita');
          }
          return response.json();
      })
}
