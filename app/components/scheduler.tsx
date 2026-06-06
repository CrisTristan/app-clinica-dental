"use client";

import { useState } from "react";
import { Scheduler } from "@aldabil/react-scheduler";
import type { ProcessedEvent, SchedulerHelpers, RemoteQuery } from "@aldabil/react-scheduler/types";
import { nanoid } from "nanoid";
import { onUpdateSomeField } from "../helpers/onUpdateSomeField";
import { toDbTimestamp } from "../helpers/dateTime";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { es } from "date-fns/locale";
import { format } from "date-fns";

interface CustomEditorProps {
  scheduler: SchedulerHelpers;
}

type AppointmentStatus = "Confirmed" | "toBeConfirmed" | "Cancelled";

const DEFAULT_STATUS: AppointmentStatus = "toBeConfirmed";

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; dot: string; badge: string; color: string }> = {
  Confirmed:     { label: "Confirmada",    dot: "bg-green-500",  badge: "bg-green-100 text-green-700 border-green-200",    color: "#16a34a" },
  toBeConfirmed: { label: "Por confirmar", dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700 border-yellow-200", color: "#eab308" },
  Cancelled:     { label: "Cancelada",     dot: "bg-red-500",    badge: "bg-red-100 text-red-700 border-red-200",          color: "#dc2626" },
}

const STATUS_OPTIONS = Object.keys(STATUS_CONFIG) as AppointmentStatus[];

const normalizeStatus = (status?: string): AppointmentStatus =>
  status === "Confirmed" || status === "Cancelled" || status === "toBeConfirmed"
    ? status
    : DEFAULT_STATUS;

/* ─── Campo de texto del editor ─── */
function Field({
  label, placeholder, value, onChange, error, maxLength, type = "text",
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; error?: string;
  maxLength?: number; type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-colors"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function App() {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);

  /* ─── Editor personalizado ─── */
  const CustomEditor = ({ scheduler }: CustomEditorProps) => {
    const event = scheduler.edited;
    const isEdit = Boolean(event);

    const startVal = scheduler.state?.start?.value
    const endVal   = scheduler.state?.end?.value

    const startLabel = startVal ? format(new Date(startVal), "d MMM · HH:mm", { locale: es }) : ""
    const endLabel   = endVal   ? format(new Date(endVal),   "HH:mm",          { locale: es }) : ""

    const [state, setState] = useState({
      id:          nanoid(),
      name:        event?.title       as string || "",
      description: event?.subtitle    as string || "",
      phone:       event?.description as string || "998",
    });

    const [errorName,  setErrorName]  = useState("");
    const [errorPhone, setErrorPhone] = useState("");

    const set = (field: string) => (v: string) =>
      setState(prev => ({ ...prev, [field]: v }));

    const handleSubmit = async () => {
      setErrorName(""); setErrorPhone("");
      if (state.name.trim().length < 3)  return setErrorName("Mínimo 3 caracteres");
      if (!/^\d+$/.test(state.phone))    return setErrorPhone("Solo números");
      if (state.phone.length < 10)       return setErrorPhone("Debe tener 10 dígitos");

      try {
        scheduler.loading(true);

        const result = await new Promise<ProcessedEvent>((resolve, reject) => {
          if (event?.event_id) {
            onUpdateSomeField(event, state).then(() =>
              resolve({
                event_id: event.event_id, title: state.name,
                subtitle: state.phone, start: event.start,
                end: event.end, description: state.description,
                status: normalizeStatus(event.status as string),
                color: STATUS_CONFIG[normalizeStatus(event.status as string)].color,
              })
            );
            return;
          }
          fetch("/appointments/api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: state.id, name: state.name, description: state.description,
              phone: state.phone,
              startDate: toDbTimestamp(scheduler.state.start.value),
              endDate:   toDbTimestamp(scheduler.state.end.value),
            }),
          })
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(() => resolve({
              event_id: state.id, title: state.name,
              subtitle: state.description, start: scheduler.state.start.value,
              end: scheduler.state.end.value, description: state.description,
              status: DEFAULT_STATUS,
              color: STATUS_CONFIG[DEFAULT_STATUS].color,
            }))
            .catch(reject);
        });

        scheduler.onConfirm(result, isEdit ? "edit" : "create");
        scheduler.close();
      } finally {
        scheduler.loading(false);
      }
    };

    return (
      /* Fondo blanco explícito — siempre visible dentro del diálogo MUI */
      <div className="bg-white overflow-hidden" style={{ minWidth: 340, maxWidth: 400 }}>

        {/* Header coloreado */}
        <div className="bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-white font-semibold text-sm">
              {isEdit ? "Editar cita" : "Nueva cita"}
            </h3>
          </div>
          {startLabel && (
            <p className="text-sky-100 text-xs mt-1">
              {startLabel}{endLabel ? ` – ${endLabel}` : ""}
            </p>
          )}
        </div>

        {/* Cuerpo del formulario — fondo gris claro para distinguirlo del diálogo */}
        <div className="bg-gray-50 px-5 py-4 space-y-3 border-b border-gray-100">
          <Field label="Paciente"        placeholder="Nombre completo"  value={state.name}        onChange={set("name")}        error={errorName}  />
          <Field label="Motivo"          placeholder="Ej. Limpieza dental" value={state.description} onChange={set("description")} />
          <Field label="Teléfono"        placeholder="10 dígitos"       value={state.phone}       onChange={set("phone")}       error={errorPhone} maxLength={10} />
        </div>

        {/* Footer con botones */}
        <div className="bg-white px-5 py-3 flex justify-end gap-2">
          <button
            onClick={scheduler.close}
            className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 rounded-lg transition-all shadow-sm"
          >
            {isEdit ? "Guardar cambios" : "Crear cita"}
          </button>
        </div>

      </div>
    );
  };

  /* ─── Fetch remoto ─── */
  const fetchRemoteData = async (_q: RemoteQuery): Promise<ProcessedEvent[]> => {
    const r = await fetch("/appointments/api");
    if (!r.ok) throw new Error("Error al cargar citas");
    const data = await r.json();

    const formatted: ProcessedEvent[] = data.map((ev: any) => ({
      event_id:    ev.id,
      title:       ev.name.name,
      description: ev.name.telefono,
      subtitle:    ev.desc,
      status:      ev.status,
      color:       STATUS_CONFIG[normalizeStatus(ev.status)].color,
      start: new Date(ev.startDate),
      end:   new Date(ev.endDate),
    }));

    setEvents(formatted);
    return formatted;
  };

  /* ─── Cambio de estado ─── */
  const handleStatusChange = (eventId: number | string, newStatus: AppointmentStatus, phone: number | string) => {
    onUpdateSomeField(undefined, undefined, eventId, newStatus, phone).then(() => {
      setEvents(prev =>
        prev.map(e =>
          e.event_id === eventId
            ? { ...e, status: newStatus, color: STATUS_CONFIG[newStatus].color }
            : e
        )
      );
    });
  };

  /* ─── Drag & drop ─── */
  const onEventDrop = async (
    _e: React.DragEvent<HTMLButtonElement>,
    droppedOn: Date,
    updatedEvent: ProcessedEvent,
    originalEvent: ProcessedEvent,
  ): Promise<ProcessedEvent | void> => {
    const duration = originalEvent.end.getTime() - originalEvent.start.getTime();
    const newEnd   = new Date(droppedOn.getTime() + duration);

    await fetch("/appointments/api", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updatedEvent.event_id, name: updatedEvent.name,
        phone: updatedEvent.subtitle, description: updatedEvent.description,
        startDate: toDbTimestamp(droppedOn), endDate: toDbTimestamp(newEnd),
      }),
    });

    setEvents(prev =>
      prev.map(e =>
        e.event_id === originalEvent.event_id
          ? { ...e, start: droppedOn, end: newEnd }
          : e
      )
    );
    return updatedEvent;
  };

  /* ─── Delete ─── */
  const onDelete = async (deletedId: string | number): Promise<void> => {
    await fetch("/appointments/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deletedId }),
    });
    setEvents(prev => prev.filter(e => e.event_id !== deletedId));
  };

  /* ─── Render ─── */
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
        event: { title: "Paciente", subtitle: "Teléfono", start: "Inicio", end: "Fin", allDay: "Todo el día" },
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
      customEditor={scheduler => <CustomEditor scheduler={scheduler} />}
      viewerExtraComponent={(_fields, event) => {
        const status = normalizeStatus(event.status as string);
        const cfg = STATUS_CONFIG[status];

        return (
          <div className="mt-2 space-y-3">

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>

            {event.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
            )}

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cambiar estado</p>
              <RadioGroup
                defaultValue={status}
                onValueChange={val => handleStatusChange(event.event_id, normalizeStatus(val), String(event.subtitle ?? ""))}
                className="space-y-1.5"
              >
                {STATUS_OPTIONS.map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <RadioGroupItem value={s} id={`${s}-${event.event_id}`} />
                    <Label
                      htmlFor={`${s}-${event.event_id}`}
                      className={`text-xs cursor-pointer px-2 py-0.5 rounded-full border ${STATUS_CONFIG[s].badge}`}
                    >
                      {STATUS_CONFIG[s].label}
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
