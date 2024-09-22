import { useState } from "react";
import { TextField, Button, DialogActions } from "@mui/material";
import { Scheduler } from "@aldabil/react-scheduler";
import type {
  ProcessedEvent,
  SchedulerHelpers,
} from "@aldabil/react-scheduler/types";


export interface Appointment {
  event_id: string|number
  title: string
  start: Date|string
  end: Date|string
}

interface CustomEditorProps {
  scheduler: SchedulerHelpers;
}
const CustomEditor = ({ scheduler }: CustomEditorProps) => {
  const event = scheduler.edited;

  // Make your own form/state
  const [state, setState] = useState({
    title: event?.title || "",
    description: event?.description || "",
    start: new Date().getDate(),
    endDate: new Date().getMinutes()+30
  });

  const [error, setError] = useState("");

  const [appointments, setAppointments] = useState([])

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
    if (state.title.length < 3) {
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
        fetch('http://localhost:3000/appointments/api', {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({"even_id": 1}) 
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
            event_id: event?.event_id || Math.random(),
            title: state.title,
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
          value={state.title}
          onChange={(e) => handleChange(e.target.value, "title")}
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
  return (
    <Scheduler
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

