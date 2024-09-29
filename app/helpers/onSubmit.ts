import { Appointment } from "../types/types";
import { onUpdateSomeField } from "./onUpdateSomeField";
import { ProcessedEvent } from "@aldabil/react-scheduler/types";

export const onSubmit = async (state : Appointment, scheduler, event, setError) => {
    // Your own validation
    if (state.name.length < 3) {
      return setError("Min 3 letters");
    }

    try {
      scheduler.loading(true);

      /**Simulate remote data saving */
      const added_updated_event = (await new Promise((resolve, reject) => {
        /**
         * Make sure the event have 4 mandatory fields
         * event_id: string|number
         * title: string
         * start: Date|string
         * end: Date|string
         */
        if(event?.event_id){
            const update = onUpdateSomeField(event, state)
            update.then( (data) =>{
              resolve({
                event_id: event?.event_id,
                title: state.name,
                start: event.start,
                end: event.end,
                description: state.description
              });
            })

            return;
        }

        fetch('http://localhost:3000/appointments/api', {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            "id": state.id,
            "name": state.name,
            "description": state.description,
            "startDate" : new Date(scheduler.state.start.value),
            "endDate": new Date(new Date(scheduler.state.end.value)), 
          }) 
        })
          .then(response => {
            if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          console.log(data);
          resolve({
            event_id: event?.event_id || state.id,
            title: state.name,
            start: scheduler.state.start.value,
            end: scheduler.state.end.value,
            description: state.description
          }); // Resuelve la promesa con los datos obtenidos
        })
        .catch(error => {
          console.error('Error fetching data:', error);
          reject(error); // Rechaza la promesa en caso de error
        });    
      })) as ProcessedEvent;

      scheduler.onConfirm(added_updated_event, event ? "edit" : "create");
      scheduler.close();
    } finally {
      scheduler.loading(false);
    }
  };