"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { ProcessedEvent, SchedulerHelpers } from "@aldabil/react-scheduler/types";
import { nanoid } from "nanoid";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { ChevronDown, X } from "lucide-react";
import { onUpdateSomeField } from "../helpers/onUpdateSomeField";
import { toDbTimestamp } from "../helpers/dateTime";
import SearchableSelect from "./SearchableSelect";
import {
  DEFAULT_STATUS,
  STATUS_CONFIG,
  Field,
  normalizeStatus,
  patientFullName,
  dentistDisplayName,
  isValidPersonText,
  type SchedulerEvent,
  type PatientOption,
  type DentistOption,
  type PatientType,
} from "./schedulerShared";

interface NewAppointmentWindowProps {
  /** Helpers que el scheduler entrega a su editor personalizado. */
  scheduler: SchedulerHelpers;
  /** Permite reflejar en el calendario la cita creada o editada. */
  setEvents: Dispatch<SetStateAction<ProcessedEvent[]>>;
}

/** Un plan de tratamiento vigente del paciente (id para consultar su detalle). */
type ActivePlan = { id: number; nombre: string };

/** Un procedimiento del plan (treatment_plan_procedures) listo para el checklist. */
type PlanProcedure = { key: string; nombre: string; cantidad: number | null; planNombre: string };

/** Un procedimiento del selector "Otros procedimientos" (clínica o catálogo normativo). */
type OtherProcedure = { value: string; nombre: string; source: "clinic" | "catalog" };

/* ─────────────────────────────────────────────────────────────────────────
   Ventana emergente que aparece al intentar agendar (o editar) una cita.
   Es el editor personalizado del scheduler: elige el tipo de paciente,
   captura/selecciona sus datos y el detalle de la cita, y finalmente la
   guarda contra la API.
   ───────────────────────────────────────────────────────────────────────── */

export default function NewAppointmentWindow({ scheduler, setEvents }: NewAppointmentWindowProps) {
  const event = scheduler.edited as SchedulerEvent | undefined;
  const isEdit = Boolean(event);
  const nameParts = isEdit && event?.title
    ? String(event.title).trim().split(/\s+/)
    : [];
  const startVal = scheduler.state?.start?.value;
  const endVal = scheduler.state?.end?.value;
  const startLabel = startVal ? format(new Date(startVal), "d MMM · HH:mm", { locale: es }) : "";
  const endLabel = endVal ? format(new Date(endVal), "HH:mm", { locale: es }) : "";

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
  const [dentists, setDentists] = useState<DentistOption[]>([]);
  const [reason, setReason] = useState(String(event?.reason || event?.subtitle || ""));
  const [selectedDentistId, setSelectedDentistId] = useState(String(event?.dentistId || event?.dentist?.id || ""));
  const [patientSearch, setPatientSearch] = useState("");
  const [activePlans, setActivePlans] = useState<ActivePlan[]>([]);
  const [isLoadingTreatments, setIsLoadingTreatments] = useState(false);
  // Procedimientos ligados a los tratamientos activos y las claves marcadas en el checklist.
  const [planProcedures, setPlanProcedures] = useState<PlanProcedure[]>([]);
  const [selectedProcedureKeys, setSelectedProcedureKeys] = useState<string[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);
  // "Otros procedimientos": catálogo combinado (clínica + normativo) y los elegidos.
  const [showOtherProcedures, setShowOtherProcedures] = useState(false);
  const [otherProcedureOptions, setOtherProcedureOptions] = useState<OtherProcedure[]>([]);
  const [otherProceduresLoaded, setOtherProceduresLoaded] = useState(false);
  const [isLoadingOtherProcedures, setIsLoadingOtherProcedures] = useState(false);
  const [loadOtherProceduresError, setLoadOtherProceduresError] = useState("");
  const [otherProcedures, setOtherProcedures] = useState<OtherProcedure[]>([]);
  const [otherProcedureFilter, setOtherProcedureFilter] = useState<"all" | "clinic" | "catalog">("all");
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingDentists, setIsLoadingDentists] = useState(true);
  const [loadPatientsError, setLoadPatientsError] = useState("");
  const [loadDentistsError, setLoadDentistsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [errorName, setErrorName] = useState("");
  const [errorApellidoPat, setErrorApellidoPat] = useState("");
  const [errorApellidoMat, setErrorApellidoMat] = useState("");
  const [errorPhone, setErrorPhone] = useState("");
  const [errorReason, setErrorReason] = useState("");
  const [errorDentist, setErrorDentist] = useState("");

  const toggleProcedure = (key: string) =>
    setSelectedProcedureKeys(previous =>
      previous.includes(key) ? previous.filter(k => k !== key) : [...previous, key]);

  // Carga (una sola vez) el catálogo combinado de procedimientos clínica + normativo.
  const loadOtherProcedures = () => {
    if (otherProceduresLoaded || isLoadingOtherProcedures) return;
    setIsLoadingOtherProcedures(true);
    setLoadOtherProceduresError("");
    fetch("/api/procedures")
      .then(response => {
        if (!response.ok) throw new Error("No se pudieron cargar los procedimientos");
        return response.json();
      })
      .then((data: { procedures?: OtherProcedure[] }) => {
        setOtherProcedureOptions(data.procedures ?? []);
        setOtherProceduresLoaded(true);
      })
      .catch(() => setLoadOtherProceduresError("No se pudieron cargar los procedimientos."))
      .finally(() => setIsLoadingOtherProcedures(false));
  };

  const toggleOtherProcedures = () => {
    setShowOtherProcedures(previous => {
      const next = !previous;
      if (next) loadOtherProcedures();
      return next;
    });
  };

  const addOtherProcedure = (value: string) => {
    const option = otherProcedureOptions.find(procedure => procedure.value === value);
    if (!option || otherProcedures.some(procedure => procedure.value === value)) return;
    setOtherProcedures(previous => [...previous, option]);
  };

  const removeOtherProcedure = (value: string) =>
    setOtherProcedures(previous => previous.filter(procedure => procedure.value !== value));

  const set = (field: keyof typeof state) => (value: string) =>
    setState(previous => ({ ...previous, [field]: value }));

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

  useEffect(() => {
    // Solo aplica a pacientes registrados: si hay patient_id, consulta sus planes
    // de tratamiento vigentes (en proceso o autorizados) y, en el mismo flujo, los
    // procedimientos de cada uno. Se publica todo junto para evitar la cascada
    // "primero el tratamiento y luego los procedimientos".
    if (!state.patientId) {
      setActivePlans([]);
      setPlanProcedures([]);
      setSelectedProcedureKeys([]);
      return;
    }

    const controller = new AbortController();
    setIsLoadingTreatments(true);
    setIsLoadingProcedures(true);

    (async () => {
      try {
        const plansResponse = await fetch(`/api/treatment-plans?patientId=${state.patientId}`, { signal: controller.signal });
        if (!plansResponse.ok) throw new Error("No se pudieron cargar los tratamientos");
        const plansData: { plans?: { id: number; nombre: string; status: string | null }[] } = await plansResponse.json();

        const activos = (plansData.plans ?? [])
          .filter(plan => plan.status === "in_progress" || plan.status === "authorized")
          .map(plan => ({ id: plan.id, nombre: plan.nombre }));

        // Detalle de todos los planes activos en paralelo: procedimientos + su dentista.
        const planDetails = await Promise.all(
          activos.map(plan =>
            fetch(`/api/treatment-plans/${plan.id}`, { signal: controller.signal })
              .then(response => {
                if (!response.ok) throw new Error("No se pudieron cargar los procedimientos");
                return response.json();
              })
              .then((data: { plan?: { dentist_id?: string | null; procedures?: { nombre: string; cantidad: number | null }[] } }) => ({
                dentistId: data.plan?.dentist_id ?? null,
                procedures: (data.plan?.procedures ?? []).map((proc, index): PlanProcedure => ({
                  key: `${plan.id}-${index}`,
                  nombre: proc.nombre,
                  cantidad: proc.cantidad,
                  planNombre: plan.nombre,
                })),
              }))
          )
        );

        if (controller.signal.aborted) return;
        // Tratamientos y procedimientos se publican a la vez.
        setActivePlans(activos);
        setPlanProcedures(planDetails.flatMap(detail => detail.procedures));
        setSelectedProcedureKeys([]);

        // Dentista por defecto: el dentist_id del primer plan activo que lo tenga.
        const defaultDentistId = planDetails.find(detail => detail.dentistId)?.dentistId;
        if (defaultDentistId) setSelectedDentistId(defaultDentistId);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setActivePlans([]);
          setPlanProcedures([]);
          setSelectedProcedureKeys([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTreatments(false);
          setIsLoadingProcedures(false);
        }
      }
    })();

    return () => controller.abort();
  }, [state.patientId]);

  const filteredPatients = patients.filter(patient =>
    `${patientFullName(patient)} ${patient.telefono}`
      .toLocaleLowerCase("es")
      .includes(patientSearch.trim().toLocaleLowerCase("es"))
  );

  const selectPatient = (patient: PatientOption) => {
    setState(previous => ({
      ...previous,
      patientId: patient.id,
      name: patient.nombre,
      apellido_pat: patient.apellido_pat || "",
      apellido_mat: patient.apellido_mat || "",
      phone: patient.telefono,
    }));
    setErrorName("");
    setErrorApellidoPat("");
    setErrorApellidoMat("");
    setErrorPhone("");
    // El paciente registrado ya tiene sus datos, así que se salta el formulario
    // y va directo al detalle de la cita (motivo de consulta).
    setEditorStep(3);
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

  // "Atrás" desde el detalle de la cita: el paciente nuevo vuelve a su formulario;
  // el registrado vuelve a la lista para poder elegir otro paciente.
  const goBackFromDetails = () => {
    if (patientType === "registered") {
      setState(previous => ({
        ...previous,
        patientId: null,
        name: "",
        apellido_pat: "",
        apellido_mat: "",
        phone: "",
      }));
      setEditorStep(1);
    } else {
      setEditorStep(2);
    }
  };

  const resetPatientSelection = () => {
    setPatientType(null);
    setEditorStep(1);
    setPatientSearch("");
    setSubmitError("");
    setReason("");
    setSelectedProcedureKeys([]);
    setShowOtherProcedures(false);
    setOtherProcedures([]);
    setOtherProcedureFilter("all");
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
    setErrorDentist("");
    setSubmitError("");

    if (reason.trim().length < 3) {
      setErrorReason("Escribe el motivo de la consulta");
      return;
    }
    if (!selectedDentistId) {
      setErrorDentist("Selecciona el dentista que atenderá la cita");
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
          // Reason se guarda en Appointment.reason; ya no se sincroniza ningún servicio.
          serviceId: null,
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
          serviceId: null,
          serviceName: null,
          unitPrice: 0,
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
            // Ya no se agenda un servicio del catálogo con la cita.
            serviceId: null,
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
          serviceId: null,
          serviceName: null,
          unitPrice: 0,
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

  useEffect(() => {
    // Si el paciente no tiene tratamientos activos (paciente nuevo o registrado
    // sin planes vigentes), abre "Otros procedimientos" por defecto. Solo expande;
    // nunca cierra, para no pelear si la recepcionista la colapsa a mano.
    if (showAppointmentDetails && !isLoadingTreatments && activePlans.length === 0) {
      setShowOtherProcedures(true);
      loadOtherProcedures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAppointmentDetails, isLoadingTreatments, activePlans.length]);

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
        {state.patientId && (
          <div className="mt-2">
            {isLoadingTreatments ? (
              <p className="text-center text-xs text-sky-100">Consultando tratamientos activos…</p>
            ) : activePlans.length ? (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="flex items-center gap-2">
                  {/* Indicador verde con brillo: anillo pulsante (fuerte→bajo) + halo suave. */}
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 shadow-[0_0_12px_3px_rgba(52,211,153,0.9)]" />
                  </span>
                  <p className="text-sm font-semibold tracking-wide text-white">
                    {activePlans.length === 1
                      ? "1 tratamiento activo"
                      : `${activePlans.length} tratamientos activos`}
                  </p>
                </div>
                <p className="text-sm font-medium text-emerald-50">
                  {activePlans.map(plan => plan.nombre).join(", ")}
                </p>
              </div>
            ) : (
              <p className="text-center text-xs text-sky-100">Sin tratamientos activos</p>
            )}
          </div>
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

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                Procedimientos a realizar
              </label>
              <p className="text-xs text-gray-500">Procedimientos a realizar en esta cita.</p>
              {isLoadingProcedures ? (
                <p className="px-1 py-2 text-xs text-gray-500">Cargando procedimientos…</p>
              ) : planProcedures.length ? (
                <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-2">
                  {planProcedures.map(procedure => (
                    <label
                      key={procedure.key}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-sky-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProcedureKeys.includes(procedure.key)}
                        onChange={() => toggleProcedure(procedure.key)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300 text-sky-600"
                      />
                      <span className="flex-1 truncate">{procedure.nombre}</span>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        x{procedure.cantidad ?? 1}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-center text-xs text-gray-500">
                  Sin procedimientos en tratamientos activos.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={toggleOtherProcedures}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition hover:bg-gray-50"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Otros procedimientos
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showOtherProcedures ? "rotate-180" : ""}`} />
              </button>

              {showOtherProcedures && (
                <div className="space-y-2">
                  <SearchableSelect
                    options={otherProcedureOptions
                      .filter(procedure => !otherProcedures.some(selected => selected.value === procedure.value))
                      .filter(procedure => otherProcedureFilter === "all" || procedure.source === otherProcedureFilter)
                      .map(procedure => ({
                        value: procedure.value,
                        label: procedure.nombre,
                      }))}
                    value=""
                    onChange={addOtherProcedure}
                    placeholder="Buscar procedimiento…"
                    loading={isLoadingOtherProcedures}
                    emptyText="Sin procedimientos"
                    direction="right"
                    listHeader={
                      <div className="flex gap-1">
                        {([
                          ["all", "Todos"],
                          ["clinic", "Clínico"],
                          ["catalog", "Normativo"],
                        ] as const).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setOtherProcedureFilter(key)}
                            className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                              otherProcedureFilter === key
                                ? "bg-sky-500 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    }
                  />
                  {loadOtherProceduresError && <p className="text-xs text-red-500">{loadOtherProceduresError}</p>}

                  {otherProcedures.length > 0 && (
                    <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-2">
                      {otherProcedures.map(procedure => (
                        <div
                          key={procedure.value}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700"
                        >
                          <span className="flex-1 truncate">{procedure.nombre}</span>
                          <button
                            type="button"
                            onClick={() => removeOtherProcedure(procedure.value)}
                            className="shrink-0 text-gray-400 hover:text-red-500"
                            title="Quitar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                Dentista que atiende
              </label>
              <SearchableSelect
                options={dentists.map(dentist => ({ value: dentist.id, label: dentistDisplayName(dentist) }))}
                value={selectedDentistId}
                onChange={value => {
                  setSelectedDentistId(value);
                  setErrorDentist("");
                }}
                placeholder={isLoadingDentists ? "Cargando dentistas..." : "Escribe o selecciona un dentista"}
                disabled={isLoadingDentists}
                loading={isLoadingDentists}
                direction="up"
                emptyText="Sin dentistas"
              />
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
            onClick={goBackFromDetails}
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
            disabled={isLoadingDentists}
            className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-sky-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEdit ? "Guardar cambios" : "Crear cita"}
          </button>
        )}
      </div>
    </div>
  );
}
