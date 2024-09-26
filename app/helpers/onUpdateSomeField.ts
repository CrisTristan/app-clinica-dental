import React, {useState} from "react";
import { ProcessedEvent } from "@aldabil/react-scheduler/types";
import {Appointment} from "../types/types"

export const onUpdateSomeField = async(event: ProcessedEvent, state : Appointment)=>{

    console.log(event);
    console.log(state);

    fetch('http://localhost:3000/appointments/api', {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "id": event?.event_id,
            "name": state.name,
            "description": state.description,
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