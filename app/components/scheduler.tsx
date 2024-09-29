import { useEffect, useState } from "react";
import { TextField, Button, DialogActions } from "@mui/material";
import { Scheduler } from "@aldabil/react-scheduler";
import type {
  ProcessedEvent,
  SchedulerHelpers,
  RemoteQuery
} from "@aldabil/react-scheduler/types";
import {nanoid} from 'nanoid';
import { onSubmit } from "../helpers/onSubmit";
import {onUpdateSomeField} from '../helpers/onUpdateSomeField'


interface CustomEditorProps {
  scheduler: SchedulerHelpers;
}
const CustomEditor = ({ scheduler }: CustomEditorProps) => {
  const event = scheduler.edited;

  // Make your own form/state
  const [state, setState] = useState({
    id: nanoid(),
    name: event?.title || "",
    description: event?.description || ""
  });

  const [error, setError] = useState("");

  const handleChange = (value: string, name: string) => {
    setState((prev) => {
      return {
        ...prev,
        [name]: value,
      };
    });
  };
  
  const handleSubmit = async () => {
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

  return (
    <div>
      <div style={{ padding: "1rem" }}>
        <p>Proxima Cita</p>
        <TextField
          label="Paciente"
          value={state.name}
          onChange={(e) => handleChange(e.target.value, "name")}
          error={!!error}
          helperText={error}
          fullWidth
        />
        <TextField
          label="Description"
          value={state.description}
          onChange={(e) => handleChange(e.target.value, "description")}
          fullWidth
        />
        <Button
          onClick={() => {
            alert("rec");
          }}
        >
          Recordatorio
        </Button>
      </div>
      <DialogActions>
        <Button onClick={scheduler.close}>Cancel</Button>
        <Button onClick={handleSubmit}>Confirm</Button>
      </DialogActions>
    </div>
  );
};

function App() {

  const [events, setEvents] = useState<ProcessedEvent[]>([]);


  const fetchRemoteData = async (query: RemoteQuery): Promise<ProcessedEvent[]> => {
    console.log({ query });
    /**Simulate fetchin remote data */

    return new Promise( async (res, rej)=>{
        try {
        const response = await fetch('http://localhost:3000/appointments/api');
        if (!response.ok) {
          throw new Error('Error en la respuesta de la red');
        }
        const data = await response.json();

        const formattedEvents = data.map(event => ({
          event_id : event.id,
          title: event.name,
          description: event.desc,
          start: new Date(event.startDate), // Asegúrate de que 'start' sea la clave correcta
          end: new Date(event.endDate)      // Asegúrate de que 'end' sea la clave correcta
        }));

        return res(formattedEvents)
        } catch (err) {
        console.log(err)
        }
        
    });
    
  };
   
  


  const onEventDrop = async (
    event: React.DragEvent<HTMLButtonElement>,
    droppedOn: Date,
    updatedEvent: ProcessedEvent,
    originalEvent: ProcessedEvent
  ): Promise<ProcessedEvent | void> => {
    
    // Aquí puedes agregar lógica para manejar el evento arrastrado
    const updatedEvents = events.map((existingEvent) =>
      existingEvent.event_id === originalEvent.event_id
        ? { ...existingEvent, start: droppedOn, end: new Date(droppedOn.getTime() + (originalEvent.end.getTime() - originalEvent.start.getTime())) }
        : existingEvent
    );

    console.log("Se ha movido un evento")
    console.log("UpdatedEvent", updatedEvent);
    console.log("original Event", originalEvent);

    fetch('http://localhost:3000/appointments/api', {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "id": updatedEvent.event_id,
        "name": updatedEvent.name,
        "description": updatedEvent.description,
        "startDate" : new Date(updatedEvent.start),
        "endDate": new Date(updatedEvent.end), 
      }) 
    }).then(response => {
      if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }).catch(error => {
    console.error('Error fetching data:', error);
  });

    setEvents(updatedEvents);
    return updatedEvent; // O puedes devolver void si no necesitas regresar nada
  };

  const onDelete = async (deletedId: string | number): Promise<void> => {
    // Filtramos los eventos para eliminar el evento que coincide con el id
    const updatedEvents = events.filter((event) => event.id !== deletedId);
    setEvents(updatedEvents);
    fetch('http://localhost:3000/appointments/api', {
      method: "DELETE",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "id": deletedId,
      }) 
    }).then(response => {
      if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }).catch(error => {
    console.error('Error fetching data:', error);
  });
    return deletedId; // Opcional, puedes devolver el ID del evento eliminado
  };

  return (
    <Scheduler
      getRemoteEvents={fetchRemoteData}
      onEventDrop={onEventDrop}
      onDelete={onDelete}
      week={{
      weekDays: [0, 1, 2, 3, 4, 5],
      weekStartOn: 1,
      startHour: 9,
      endHour: 20,
      step: 30,
      cellRenderer: ({ height, start, onClick, ...props }) => {
        // Fake some condition up
        const hour = start.getHours();
        const disabled = hour === 14;
        const restProps = disabled ? {} : props;
        return (
          <Button
            style={{
              height: "100%",
              background: disabled ? "#eee" : "transparent",
              cursor: disabled ? "not-allowed" : "pointer"
            }}
            onClick={() => {
              if (disabled) {
                return alert("Opss");
              }
              onClick();
            }}
            disableRipple={disabled}
            // disabled={disabled}
            {...restProps}
          ></Button>
        );
      }
    }}
      customEditor={(scheduler) => <CustomEditor scheduler={scheduler} />}
      viewerExtraComponent={(fields, event) => {
        return (
          <div>
            <p>Useful to render custom fields...</p>
            <p>Description: {event.description || "Nothing..."}</p>
          </div>
        );
      }}
    />
  );
}

export default App;

