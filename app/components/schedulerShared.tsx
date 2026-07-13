"use client";

import type { ProcessedEvent } from "@aldabil/react-scheduler/types";

/* ─────────────────────────────────────────────────────────────────────────
   Tipos, constantes y helpers compartidos entre el calendario (scheduler) y
   la ventana emergente para agendar/editar una cita (newAppointmentWindow).
   Se centralizan aquí para evitar duplicarlos y prevenir dependencias
   circulares entre ambos archivos.
   ───────────────────────────────────────────────────────────────────────── */

export interface PatientOption {
  id: number;
  nombre: string;
  apellido_pat?: string | null;
  apellido_mat?: string | null;
  telefono: string;
}

export interface ServiceOption {
  id: number;
  name: string;
  price: number;
}

export interface DentistOption {
  id: string;
  nombre: string | null;
  email?: string | null;
  phone?: string | null;
}

export type PatientType = "new" | "registered";
export type AppointmentStatus = "Confirmed" | "toBeConfirmed" | "Cancelled" | "Completed";
export type SchedulerEvent = ProcessedEvent & {
  dentistId?: string | null;
  dentist?: DentistOption | null;
  serviceId?: number | null;
  serviceName?: string | null;
  unitPrice?: number;
  reason?: string | null;
};

export const DEFAULT_STATUS: AppointmentStatus = "toBeConfirmed";

export const STATUS_CONFIG: Record<AppointmentStatus, { label: string; dot: string; badge: string; color: string }> = {
  Confirmed: {
    label: "Confirmada",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-700 border-green-200",
    color: "#16a34a",
  },
  toBeConfirmed: {
    label: "Por confirmar",
    dot: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    color: "#eab308",
  },
  Cancelled: {
    label: "Cancelada",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border-red-200",
    color: "#dc2626",
  },
  Completed: {
    label: "Completada",
    dot: "bg-indigo-500",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    color: "#4f46e5",
  },
};

export const STATUS_OPTIONS = Object.keys(STATUS_CONFIG) as AppointmentStatus[];

export const normalizeStatus = (status?: string): AppointmentStatus =>
  status === "Confirmed" || status === "Cancelled" || status === "toBeConfirmed" || status === "Completed"
    ? status
    : DEFAULT_STATUS;

export const patientFullName = (patient: PatientOption) =>
  [patient.nombre, patient.apellido_pat, patient.apellido_mat].filter(Boolean).join(" ");

export const dentistDisplayName = (dentist?: DentistOption | null) =>
  dentist?.nombre?.trim() || dentist?.email || "Dentista sin nombre";

export const isValidPersonText = (value: string) =>
  /^[\p{L}\s'.-]{3,}$/u.test(value.trim());

export function Field({
  label,
  placeholder,
  value,
  onChange,
  error,
  maxLength,
  type = "text",
  disabled = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength?: number;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        maxLength={maxLength}
        disabled={disabled}
        className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-100 disabled:text-gray-500"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
