import { ProcessedEvent } from "@aldabil/react-scheduler/types";
import {Appointment} from "../types/types"
import { toDbTimestamp } from "./dateTime";

type AppointmentStatus = "Confirmed" | "toBeConfirmed" | "Cancelled";
type AppointmentUpdateState = Partial<Appointment> & {
    name?: string;
    description?: string;
    phone?: string | number;
};

const isAppointmentStatus = (status?: string): status is AppointmentStatus =>
  status === "Confirmed" || status === "toBeConfirmed" || status === "Cancelled";

export const onUpdateSomeField = async(event?: ProcessedEvent, state? : AppointmentUpdateState, eventId?: number | string, newStatus?: string, phone?: number | string)=>{
    const payload: Record<string, unknown> = {
        "id": event?.event_id || eventId,
        "name": state?.name,
        "description": state?.description,
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
        .then(response => {
          if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
}
