import { ProcessedEvent } from "@aldabil/react-scheduler/types";
import {Appointment} from "../types/types"

export const onUpdateSomeField = async(event?: ProcessedEvent, state? : Appointment, eventId?: number, newStatus?: string, phone?: number)=>{

    console.log(event);
    console.log(state);
    console.log(eventId, newStatus, phone);
    fetch('/appointments/api', {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "id": event?.event_id || eventId,
            "name": state?.name,
            "description": state?.description,
            "phone": state?.phone || phone,
            "status": newStatus === "Confirmar"? "Confirmed" : newStatus === "Cancelar" ? "Cancelled" : "toBeConfirmed",
            "startDate": event?.start,
            "endDate": event?.end
        }) 
      })
        .then(response => {
          if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
}