"use client";

import { useEffect, useState } from "react";
import { Scheduler } from "@aldabil/react-scheduler";
import type { ProcessedEvent, RemoteQuery, SchedulerHelpers } from "@aldabil/react-scheduler/types";
import { nanoid } from "nanoid";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { onUpdateSomeField } from "../helpers/onUpdateSomeField";
import { toDbTimestamp } from "../helpers/dateTime";

interface CustomEditorProps {
  scheduler: SchedulerHelpers;
}

interface PatientOption {
  id: number;
  name: string;
  apellido_pat?: string | null;
  apellido_mat?: string | null;
  telefono: string;
}

interface ServiceOption {
  id: number;
  name: string;
  price: number;
}

interface DentistOption {
  id: string;
  nombre: string | null;
  email?: string | null;
  phone?: string | null;
}

type PatientType = "new" | "registered";
type AppointmentStatus = "Confirmed" | "toBeConfirmed" | "Cancelled" | "Completed";
type SchedulerEvent = ProcessedEvent & {
  dentistId?: string | null;
  dentist?: DentistOption | null;
  serviceId?: number | null;
  serviceName?: string | null;
  unitPrice?: number;
  reason?: string | null;
};

const DEFAULT_STATUS: AppointmentStatus = "toBeConfirmed";

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; dot: string; badge: string; color: string }> = {
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

const STATUS_OPTIONS = Object.keys(STATUS_CONFIG) as AppointmentStatus[];

const normalizeStatus = (status?: string): AppointmentStatus =>
  status === "Confirmed" || status === "Cancelled" || status === "toBeConfirmed" || status === "Completed"
    ? status
    : DEFAULT_STATUS;

const patientFullName = (patient: PatientOption) =>
  [patient.name, patient.apellido_pat, patient.apellido_mat].filter(Boolean).join(" ");

const dentistDisplayName = (dentist?: DentistOption | null) =>
  dentist?.nombre?.trim() || dentist?.email || "Dentista sin nombre";

const isValidPersonText = (value: string) =>
  /^[\p{L}\s'.-]{3,}$/u.test(value.trim());

function Field({
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

function App() {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);

  const CustomEditor = ({ scheduler }: CustomEditorProps) => {
    const event = scheduler.edited as SchedulerEvent | undefined;
    const isEdit = Boolean(event);
    const nameParts = isEdit && event?.title
      ? String(event.title).trim().split(/\s+/)
      : [];
    const startVal = scheduler.state?.start?.value;
    const endVal = scheduler.state?.end?.value;
    const startLabel = startVal ? format(new Date(startVal), "d MMM · HH:mm", { locale: es }) : "";
    const endLabel = endVal ? format(new Date(endVal), "HH:mm", { locale: es }) : "";

    const initialServiceValue = event?.serviceId ? String(event.serviceId) : "";

    const [state, setState] = useState({
      id: nanoid(),
      patientId: null as number | null,
      name: nameParts[0] || "",
      apellido_pat: nameParts[1] || "",
      apellido_mat: nameParts.slice(2).join(" "),
      phone: String(event?.description || (isEdit ? "" : "998")),
    });
    const [patientType, setPatientType] = useState<PatientType | null>(isEdit ? "registered" : null);
    const [editorStep, setEditorStep] = useState<1 | 2 | 3>(isEdit ? 3 : 1);
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const [services, setServices] = useState<ServiceOption[]>([]);
    const [dentists, setDentists] = useState<DentistOption[]>([]);
    const [reason, setReason] = useState(String(event?.reason || event?.subtitle || ""));
    const [willDoService, setWillDoService] = useState(Boolean(event?.serviceId));
    const [selectedServiceId, setSelectedServiceId] = useState(initialServiceValue);
    const [selectedDentistId, setSelectedDentistId] = useState(String(event?.dentistId || event?.dentist?.id || ""));
    const [patientSearch, setPatientSearch] = useState("");
    const [isLoadingPatients, setIsLoadingPatients] = useState(false);
    const [isLoadingServices, setIsLoadingServices] = useState(true);
    const [isLoadingDentists, setIsLoadingDentists] = useState(true);
    const [loadPatientsError, setLoadPatientsError] = useState("");
    const [loadServicesError, setLoadServicesError] = useState("");
    const [loadDentistsError, setLoadDentistsError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [errorName, setErrorName] = useState("");
    const [errorApellidoPat, setErrorApellidoPat] = useState("");
    const [errorApellidoMat, setErrorApellidoMat] = useState("");
    const [errorPhone, setErrorPhone] = useState("");
    const [errorReason, setErrorReason] = useState("");
    const [errorService, setErrorService] = useState("");
    const [errorDentist, setErrorDentist] = useState("");

    const set = (field: keyof typeof state) => (value: string) =>
      setState(previous => ({ ...previous, [field]: value }));

    useEffect(() => {
      const controller = new AbortController();

      // Carga los servicios disponibles para que el motivo de la cita sea consistente.
      fetch("/api/catalog", { signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error("No se pudieron cargar los servicios");
          return response.json();
        })
        .then((data: ServiceOption[]) => {
          setServices(data);

          const currentServiceId = event?.serviceId ? String(event.serviceId) : "";
          if (currentServiceId && data.some(service => String(service.id) === currentServiceId)) {
            setWillDoService(true);
            setSelectedServiceId(currentServiceId);
          }
        })
        .catch(error => {
          if ((error as Error).name !== "AbortError") {
            setLoadServicesError("No se pudieron cargar los servicios.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoadingServices(false);
        });

      return () => controller.abort();
    }, []);

    useEffect(() => {
      const controller = new AbortController();

      // Carga solo usuarios con rol dentista desde profiles para asignarlos a la cita.
      fetch("/api/dentists", { signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error("No se pudieron cargar los dentistas");
          return response.json();
        })
        .then((data: DentistOption[]) => setDentists(data))
        .catch(error => {
          if ((error as Error).name !== "AbortError") {
            setLoadDentistsError("No se pudieron cargar los dentistas.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoadingDentists(false);
        });

      return () => controller.abort();
    }, []);

    useEffect(() => {
      if (patientType !== "registered" || isEdit || patients.length > 0) return;

      const controller = new AbortController();
      setIsLoadingPatients(true);
      setLoadPatientsError("");

      fetch("/patients/api?list=1", { signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error("No se pudieron cargar los pacientes");
          return response.json();
        })
        .then((data: PatientOption[]) => setPatients(data))
        .catch(error => {
          if ((error as Error).name !== "AbortError") {
            setLoadPatientsError("No se pudieron cargar los pacientes.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoadingPatients(false);
        });

      return () => controller.abort();
    }, [patientType, isEdit, patients.length]);

    const filteredPatients = patients.filter(patient =>
      `${patientFullName(patient)} ${patient.telefono}`
        .toLocaleLowerCase("es")
        .includes(patientSearch.trim().toLocaleLowerCase("es"))
    );

    const selectPatient = (patient: PatientOption) => {
      setState(previous => ({
        ...previous,
        patientId: patient.id,
        name: patient.name,
        apellido_pat: patient.apellido_pat || "",
        apellido_mat: patient.apellido_mat || "",
        phone: patient.telefono,
      }));
      setErrorName("");
      setErrorApellidoPat("");
      setErrorApellidoMat("");
      setErrorPhone("");
      setEditorStep(2);
    };

    const validatePatientFields = () => {
      setErrorName("");
      setErrorApellidoPat("");
      setErrorApellidoMat("");
      setErrorPhone("");

      if (!isValidPersonText(state.name)) {
        setErrorName("Solo letras, mínimo 3 caracteres");
        return false;
      }
      if (!isValidPersonText(state.apellido_pat)) {
        setErrorApellidoPat("Solo letras, mínimo 3 caracteres");
        return false;
      }
      if (!isValidPersonText(state.apellido_mat)) {
        setErrorApellidoMat("Solo letras, mínimo 3 caracteres");
        return false;
      }
      if (!/^\d+$/.test(state.phone)) {
        setErrorPhone("Solo números");
        return false;
      }
      if (state.phone.length !== 10) {
        setErrorPhone("Debe tener 10 dígitos");
        return false;
      }
      if (!isEdit && patientType === "registered" && !state.patientId) {
        setErrorName("Selecciona un paciente registrado");
        return false;
      }

      return true;
    };

    const goToAppointmentDetails = () => {
      if (validatePatientFields()) {
        setEditorStep(3);
      }
    };

    const resetPatientSelection = () => {
      setPatientType(null);
      setEditorStep(1);
      setPatientSearch("");
      setSubmitError("");
      setReason("");
      setWillDoService(false);
      setSelectedServiceId("");
      setSelectedDentistId("");
      setState(previous => ({
        ...previous,
        patientId: null,
        name: "",
        apellido_pat: "",
        apellido_mat: "",
        phone: "",
      }));
    };

    const handleSubmit = async () => {
      if (!validatePatientFields()) return;

      setErrorReason("");
      setErrorService("");
      setErrorDentist("");
      setSubmitError("");

      if (reason.trim().length < 3) {
        setErrorReason("Escribe el motivo de la consulta");
        return;
      }
      if (willDoService && !selectedServiceId) {
        setErrorService("Selecciona el servicio que se realizará");
        return;
      }
      if (!selectedDentistId) {
        setErrorDentist("Selecciona el dentista que atenderá la cita");
        return;
      }

      const selectedCatalogService = willDoService
        ? services.find(service => String(service.id) === selectedServiceId) ?? null
        : null;
      if (willDoService && !selectedCatalogService) {
        setErrorService("El servicio seleccionado ya no existe en el catálogo");
        return;
      }
      const appointmentReason = reason.trim();
      const selectedDentist = dentists.find(dentist => dentist.id === selectedDentistId) || event?.dentist || null;

      try {
        scheduler.loading(true);
        let result: SchedulerEvent;

        if (event?.event_id) {
          await onUpdateSomeField(event, {
            ...state,
            reason: appointmentReason,
            dentistId: selectedDentistId,
            // En edicion, este id sincroniza appointment_services y reason se guarda en Appointment.reason.
            serviceId: selectedCatalogService?.id ?? null,
          });
          const status = normalizeStatus(event.status as string);
          result = {
            event_id: event.event_id,
            title: [state.name, state.apellido_pat, state.apellido_mat].filter(Boolean).join(" "),
            subtitle: appointmentReason,
            start: event.start,
            end: event.end,
            description: state.phone,
            status,
            color: STATUS_CONFIG[status].color,
            dentistId: selectedDentistId,
            dentist: selectedDentist,
            serviceId: selectedCatalogService?.id ?? null,
            serviceName: selectedCatalogService?.name ?? null,
            unitPrice: selectedCatalogService?.price ?? 0,
            reason: appointmentReason,
          };
        } else {
          const response = await fetch("/appointments/api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: state.id,
              patientId: state.patientId,
              name: state.name,
              apellido_pat: state.apellido_pat,
              apellido_mat: state.apellido_mat,
              phone: state.phone,
              reason: appointmentReason,
              //La API usa este id para asignar la cita al dentista correcto y validar que el usuario tiene rol de dentista.
              dentistId: selectedDentistId,
              // La API usa este id para crear la fila en appointment_services.
              serviceId: selectedCatalogService?.id ?? null,
              startDate: toDbTimestamp(scheduler.state.start.value),
              endDate: toDbTimestamp(scheduler.state.end.value),
            }),
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error || "No se pudo registrar la cita");
          }

          result = {
            event_id: state.id,
            title: [state.name, state.apellido_pat, state.apellido_mat].filter(Boolean).join(" "),
            subtitle: appointmentReason,
            start: scheduler.state.start.value,
            end: scheduler.state.end.value,
            description: state.phone,
            status: DEFAULT_STATUS,
            color: STATUS_CONFIG[DEFAULT_STATUS].color,
            dentistId: selectedDentistId,
            dentist: selectedDentist,
            serviceId: selectedCatalogService?.id ?? null,
            serviceName: selectedCatalogService?.name ?? null,
            unitPrice: selectedCatalogService?.price ?? 0,
            reason: appointmentReason,
          };
        }

        setEvents(previous => {
          const exists = previous.some(item => item.event_id === result.event_id);
          return exists
            ? previous.map(item => item.event_id === result.event_id ? { ...item, ...result } : item)
            : [...previous, result];
        });
        scheduler.onConfirm(result, isEdit ? "edit" : "create");
        scheduler.close();
      } catch (error) {
        setSubmitError((error as Error).message);
      } finally {
        scheduler.loading(false);
      }
    };

    const showPatientForm = editorStep === 2
      && (isEdit || patientType === "new" || (patientType === "registered" && Boolean(state.patientId)));
    const showAppointmentDetails = editorStep === 3
      && (isEdit || patientType === "new" || (patientType === "registered" && Boolean(state.patientId)));

    return (
      <div className="overflow-hidden bg-white" style={{ minWidth: 340, maxWidth: 400 }}>
        <div className="relative bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-4">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-sm font-semibold text-white">{isEdit ? "Editar cita" : "Nueva cita"}</h3>
          </div>
          {startLabel && (
            <p className="mt-1 text-xs text-sky-100">
              {startLabel}{endLabel ? ` – ${endLabel}` : ""}
            </p>
          )}
          {!isEdit && (
            <button
              type="button"
              className="absolute right-3 top-3 text-xs text-sky-100 hover:text-white"
              onClick={resetPatientSelection}
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="space-y-3 border-b border-gray-100 bg-gray-50 px-5 py-4">
          {!patientType && !isEdit && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">¿Qué tipo de paciente desea agendar?</p>
                <p className="mt-1 text-xs text-gray-500">Selecciona una opción para continuar.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPatientType("new");
                  setEditorStep(2);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-sky-400 hover:bg-sky-50"
              >
                <span className="block text-sm font-semibold text-gray-800">Nuevo paciente</span>
                <span className="mt-1 block text-xs text-gray-500">Capturar sus datos y crear su primera cita.</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPatientType("registered");
                  setEditorStep(1);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-sky-400 hover:bg-sky-50"
              >
                <span className="block text-sm font-semibold text-gray-800">Paciente registrado</span>
                <span className="mt-1 block text-xs text-gray-500">Elegir un paciente existente de la lista.</span>
              </button>
            </div>
          )}

          {patientType === "registered" && !state.patientId && !isEdit && (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Seleccionar paciente</p>
                  <p className="text-xs text-gray-500">Haz clic en el paciente que tendrá la cita.</p>
                </div>
                <button type="button" onClick={resetPatientSelection} className="text-xs font-medium text-sky-600">
                  Volver
                </button>
              </div>
              <input
                value={patientSearch}
                onChange={inputEvent => setPatientSearch(inputEvent.target.value)}
                placeholder="Buscar por nombre o teléfono"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                {isLoadingPatients ? (
                  <p className="px-3 py-6 text-center text-xs text-gray-500">Cargando pacientes...</p>
                ) : filteredPatients.length ? (
                  filteredPatients.map(patient => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => selectPatient(patient)}
                      className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 text-left last:border-0 hover:bg-sky-50"
                    >
                      <span className="truncate text-sm font-medium text-gray-800">{patientFullName(patient)}</span>
                      <span className="shrink-0 text-xs text-gray-500">{patient.telefono}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-gray-500">No se encontraron pacientes.</p>
                )}
              </div>
              {loadPatientsError && <p className="text-xs text-red-500">{loadPatientsError}</p>}
            </div>
          )}

          {showPatientForm && (
            <>
              {!isEdit && (
                <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2">
                  <span className="text-xs font-medium text-sky-700">
                    {patientType === "new" ? "Nuevo paciente" : "Paciente registrado"}
                  </span>
                  <button type="button" onClick={resetPatientSelection} className="text-xs font-medium text-sky-600">
                    Cambiar
                  </button>
                </div>
              )}
              <div className="space-y-3">
                <Field
                  label="Nombre del paciente"
                  placeholder="Nombre"
                  value={state.name}
                  onChange={set("name")}
                  disabled={isEdit || patientType === "registered"}
                  error={errorName}
                />
                <Field
                  label="Apellido paterno"
                  placeholder="Apellido paterno"
                  value={state.apellido_pat}
                  onChange={set("apellido_pat")}
                  disabled={isEdit || patientType === "registered"}
                  error={errorApellidoPat}
                />
                <Field
                  label="Apellido materno"
                  placeholder="Apellido materno"
                  value={state.apellido_mat}
                  onChange={set("apellido_mat")}
                  disabled={isEdit || patientType === "registered"}
                  error={errorApellidoMat}
                />
                <Field
                  label="Teléfono"
                  placeholder="10 dígitos"
                  value={state.phone}
                  onChange={set("phone")}
                  error={errorPhone}
                  maxLength={10}
                  disabled={isEdit || patientType === "registered"}
                />
                {submitError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{submitError}</p>}
              </div>
            </>
          )}

          {showAppointmentDetails && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Motivo de consulta
                </label>
                <textarea
                  value={reason}
                  onChange={textareaEvent => {
                    setReason(textareaEvent.target.value);
                    setErrorReason("");
                  }}
                  placeholder="Describe el motivo de la consulta"
                  maxLength={240}
                  className="min-h-20 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                {errorReason && <p className="text-xs text-red-500">{errorReason}</p>}
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={willDoService}
                  onChange={checkboxEvent => {
                    setWillDoService(checkboxEvent.target.checked);
                    if (!checkboxEvent.target.checked) setSelectedServiceId("");
                    setErrorService("");
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-sky-600"
                />
                Se realizará un servicio
              </label>

              {willDoService && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Servicio a realizar
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={selectEvent => {
                      setSelectedServiceId(selectEvent.target.value);
                      setErrorService("");
                    }}
                    disabled={isLoadingServices}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-100"
                  >
                    <option value="">
                      {isLoadingServices ? "Cargando servicios..." : "Selecciona un servicio"}
                    </option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>
                        {service.name} - ${service.price.toLocaleString("es-MX")}
                      </option>
                    ))}
                  </select>
                  {errorService && <p className="text-xs text-red-500">{errorService}</p>}
                  {loadServicesError && <p className="text-xs text-red-500">{loadServicesError}</p>}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Dentista que atiende
                </label>
                <select
                  value={selectedDentistId}
                  onChange={selectEvent => {
                    setSelectedDentistId(selectEvent.target.value);
                    setErrorDentist("");
                  }}
                  disabled={isLoadingDentists}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-100"
                >
                  <option value="">
                    {isLoadingDentists ? "Cargando dentistas..." : "Selecciona un dentista"}
                  </option>
                  {dentists.map(dentist => (
                    <option key={dentist.id} value={dentist.id}>
                      {dentistDisplayName(dentist)}
                    </option>
                  ))}
                </select>
                {errorDentist && <p className="text-xs text-red-500">{errorDentist}</p>}
                {loadDentistsError && <p className="text-xs text-red-500">{loadDentistsError}</p>}
                {!isLoadingDentists && !dentists.length && !loadDentistsError && (
                  <p className="text-xs text-red-500">No hay dentistas registrados en profiles.</p>
                )}
              </div>

              {submitError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{submitError}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 bg-white px-5 py-3">
          <button
            type="button"
            onClick={scheduler.close}
            className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          {!isEdit && showAppointmentDetails && (
            <button
              type="button"
              onClick={() => setEditorStep(2)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Atrás
            </button>
          )}
          {showPatientForm && (
            <button
              type="button"
              onClick={goToAppointmentDetails}
              className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-sky-600 hover:to-cyan-600"
            >
              Continuar
            </button>
          )}
          {showAppointmentDetails && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoadingServices || isLoadingDentists}
              className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-sky-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEdit ? "Guardar cambios" : "Crear cita"}
            </button>
          )}
        </div>
      </div>
    );
  };

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
        title: [appointment.name.name, appointment.name.apellido_pat, appointment.name.apellido_mat]
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
      customEditor={scheduler => <CustomEditor scheduler={scheduler} />}
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
