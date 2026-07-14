"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Reorder } from "framer-motion";
import { Calendar, Check, GripVertical, Pencil, Trash2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import SearchableSelect from "./SearchableSelect";
import VentanaPopup from "./VentanaPopup";
import {
  STATUS_CONFIG,
  STATUS_OPTIONS,
  normalizeStatus,
  dentistDisplayName,
  type SchedulerEvent,
  type AppointmentStatus,
  type DentistOption,
  type AppointmentProcedure,
} from "./schedulerShared";

// Ícono de marca de WhatsApp (lucide ya no incluye íconos de marca).
function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.98 11.98 0 005.71 1.454h.006c6.585 0 11.946-5.359 11.949-11.893a11.821 11.821 0 00-3.495-8.481" />
    </svg>
  );
}

interface AppointmentSavePatch {
  reason: string;
  dentistId: string;
  dentist: DentistOption | null;
  procedures: AppointmentProcedure[];
}

interface AppointmentViewerProps {
  event: SchedulerEvent;
  /** Cierra el popover (lo entrega el scheduler a su customViewer). */
  close: () => void;
  onStatusChange: (eventId: number | string, newStatus: AppointmentStatus, phone: number | string) => void;
  onDelete: (eventId: number | string) => void;
  /** Guarda los cambios de la cita. Por ahora solo actualiza el estado local (sin API). */
  onSave: (eventId: number | string, patch: AppointmentSavePatch) => void;
  /** Guarda la nota de la cita (disponible dentro y fuera de la edición). */
  onNoteSave: (eventId: number | string, note: string) => void;
}

// Color propio de cada estado para el círculo del RadioGroupItem. Al estar
// seleccionado (data-state=checked) se rellena con el color del estado y el
// punto se muestra en blanco, para que la selección se vea con claridad.
const STATUS_RADIO_COLOR: Record<AppointmentStatus, string> = {
  Confirmed:
    "border-green-500 text-green-600 focus-visible:ring-green-400 data-[state=checked]:border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:text-white",
  toBeConfirmed:
    "border-yellow-500 text-yellow-600 focus-visible:ring-yellow-400 data-[state=checked]:border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-white",
  Cancelled:
    "border-red-500 text-red-600 focus-visible:ring-red-400 data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:text-white",
  Completed:
    "border-indigo-500 text-indigo-600 focus-visible:ring-indigo-400 data-[state=checked]:border-indigo-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:text-white",
};

/* ─────────────────────────────────────────────────────────────────────────
   Visor personalizado de una cita (reemplaza el popover por defecto del
   scheduler). Muestra los detalles y permite editarlos en la misma ventana:
   el motivo (textarea), el dentista asignado (SearchableSelect) y el orden de
   los procedimientos a realizar (Reorder.Group arrastrable).
   ───────────────────────────────────────────────────────────────────────── */

export default function AppointmentViewer({
  event,
  close,
  onStatusChange,
  onDelete,
  onSave,
  onNoteSave,
}: AppointmentViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [reasonDraft, setReasonDraft] = useState(String(event.reason || event.subtitle || ""));
  const [selectedDentistId, setSelectedDentistId] = useState(String(event.dentistId || event.dentist?.id || ""));
  const [procedureOrder, setProcedureOrder] = useState<AppointmentProcedure[]>(event.procedures ?? []);
  const [dentists, setDentists] = useState<DentistOption[]>([]);
  const [isLoadingDentists, setIsLoadingDentists] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  // Nota de la cita: `note` es la nota confirmada; `noteDraft` es el texto del
  // panel lateral mientras se edita.
  const [note, setNote] = useState(String(event.note ?? ""));
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  // Posición fija del panel de nota, calculada a la derecha del popover.
  const rootRef = useRef<HTMLDivElement>(null);
  const [noteCoords, setNoteCoords] = useState<{ left: number; top: number } | null>(null);

  const status = normalizeStatus(event.status as string);
  const config = STATUS_CONFIG[status];

  const startLabel = event.start ? format(event.start, "d MMM yyyy · HH:mm", { locale: es }) : "";
  const endLabel = event.end ? format(event.end, "HH:mm", { locale: es }) : "";

  // Teléfono del paciente (viaja en description). Para wa.me se requiere el
  // número internacional sin símbolos; si son 10 dígitos se antepone México (52).
  const patientPhone = String(event.description ?? "").replace(/\D/g, "");
  const whatsappNumber = patientPhone.length === 10 ? `52${patientPhone}` : patientPhone;

  const openWhatsapp = () => {
    const fecha = event.start
      ? format(event.start, "EEEE d 'de' MMMM 'a las' HH:mm 'hrs'", { locale: es })
      : "";
    setWhatsappMessage(
      `Hola ${event.title}, le recordamos su cita en la clínica dental el ${fecha}. ` +
        `Por favor confirme su asistencia. ¡Le esperamos!`,
    );
    setWhatsappOpen(true);
  };

  const sendWhatsapp = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setWhatsappOpen(false);
  };

  // Al entrar en edición, carga los dentistas con rol dentista (una sola vez).
  useEffect(() => {
    if (!isEditing || dentists.length > 0) return;

    const controller = new AbortController();
    setIsLoadingDentists(true);
    fetch("/api/dentists", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("No se pudieron cargar los dentistas");
        return response.json();
      })
      .then((data: DentistOption[]) => setDentists(data))
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingDentists(false);
      });

    return () => controller.abort();
  }, [isEditing, dentists.length]);

  // Calcula la posición del panel de nota a la derecha del popover (con volteo
  // a la izquierda si no cabe) y la mantiene ante scroll/resize.
  useLayoutEffect(() => {
    if (!noteOpen) return;

    const update = () => {
      const node = rootRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const gap = 8;
      const width = 260;
      let left = rect.right + gap;
      if (left + width > window.innerWidth - 8) left = rect.left - width - gap;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const top = Math.max(8, Math.min(rect.top, window.innerHeight - 8 - 240));
      setNoteCoords({ left, top });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [noteOpen]);

  const startEditing = () => {
    // Sincroniza los borradores con los datos actuales antes de editar.
    setReasonDraft(String(event.reason || event.subtitle || ""));
    setSelectedDentistId(String(event.dentistId || event.dentist?.id || ""));
    setProcedureOrder(event.procedures ?? []);
    setIsEditing(true);
  };

  const handleSave = () => {
    // TODO: persistir los cambios en el backend cuando exista la API de edición.
    const selectedDentist = dentists.find(dentist => dentist.id === selectedDentistId) ?? event.dentist ?? null;
    onSave(event.event_id, {
      reason: reasonDraft.trim(),
      dentistId: selectedDentistId,
      dentist: selectedDentist,
      procedures: procedureOrder,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const openNotePanel = () => {
    setNoteDraft(note);
    setNoteOpen(true);
  };

  const addNote = () => {
    // La nota se guarda de inmediato (funciona dentro y fuera de la edición).
    const trimmed = noteDraft.trim();
    setNote(trimmed);
    onNoteSave(event.event_id, trimmed);
    setNoteOpen(false);
  };

  const removeProcedure = (procedureId: number) =>
    setProcedureOrder(previous => previous.filter(procedure => procedure.id !== procedureId));

  const handleDelete = () => {
    onDelete(event.event_id);
    close();
  };

  const iconButton =
    "flex h-7 w-7 items-center justify-center rounded-md text-white/90 transition hover:bg-white/20 hover:text-white";

  const hasNote = note.trim().length > 0;

  return (
    <div ref={rootRef} className="relative w-[360px] max-w-full bg-white">
      {/* Encabezado: nombre del paciente, estado y acciones. */}
      <div
        className="flex flex-col gap-2 px-4 py-3"
        style={{ backgroundColor: (event.color as string) || undefined }}
      >
        {/* Fila 1: nombre del paciente y acciones de edición. */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold leading-tight text-white">{event.title}</span>
          <div className="flex shrink-0 items-center gap-0.5">
            {isEditing ? (
              <>
                <button type="button" title="Guardar" onClick={handleSave} className={iconButton}>
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" title="Cancelar" onClick={handleCancel} className={iconButton}>
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button type="button" title="Editar" onClick={startEditing} className={iconButton}>
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Fila 2: badge + WhatsApp a la izquierda, botón de notas a la derecha. */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
              {config.label}
            </span>

            {/* WhatsApp: en verde con brillo para resaltar. */}
            <button
              type="button"
              title="Recordar cita por WhatsApp"
              onClick={openWhatsapp}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-white shadow-[0_0_10px_2px_rgba(16,185,129,0.75)] transition hover:bg-emerald-600 hover:shadow-[0_0_14px_3px_rgba(16,185,129,0.95)]"
            >
              <WhatsappIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Botón de nota: siempre visible. Cambia a "Ver notas" si ya hay una. */}
          <button
            type="button"
            onClick={openNotePanel}
            className="shrink-0 rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white transition hover:bg-white/30"
          >
            {hasNote ? "Ver notas" : "+ Nota"}
          </button>
        </div>
      </div>

      {/* Cuerpo con los detalles de la cita. */}
      <div className="space-y-3 px-4 py-3">
        {startLabel && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>
              {startLabel}
              {endLabel ? ` – ${endLabel}` : ""}
            </span>
          </div>
        )}

        {/* Motivo de la cita: editable en línea con un textarea. */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Motivo de consulta</p>
          {isEditing ? (
            <textarea
              value={reasonDraft}
              onChange={textareaEvent => setReasonDraft(textareaEvent.target.value)}
              placeholder="Describe el motivo de la consulta"
              maxLength={240}
              autoFocus
              className="min-h-20 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          ) : (
            <p className="text-sm leading-relaxed text-gray-700">
              {event.reason || event.subtitle || "Sin motivo"}
            </p>
          )}
        </div>

        {/* Dentista asignado: en edición se elige con un SearchableSelect. */}
        {(isEditing || event.dentist) && (
          <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Dentista asignado</p>
            {isEditing ? (
              <div className="mt-1">
                <SearchableSelect
                  options={dentists.map(dentist => ({ value: dentist.id, label: dentistDisplayName(dentist) }))}
                  value={selectedDentistId}
                  onChange={setSelectedDentistId}
                  placeholder={isLoadingDentists ? "Cargando dentistas..." : "Selecciona un dentista"}
                  disabled={isLoadingDentists}
                  loading={isLoadingDentists}
                  direction="down"
                  emptyText="Sin dentistas"
                />
              </div>
            ) : (
              event.dentist && (
                <>
                  <p className="mt-1 text-sm font-medium text-gray-800">{dentistDisplayName(event.dentist)}</p>
                  {event.dentist.email && <p className="text-xs text-gray-500">{event.dentist.email}</p>}
                  {event.dentist.phone && <p className="text-xs text-gray-500">{event.dentist.phone}</p>}
                </>
              )
            )}
          </div>
        )}

        {/* Procedimientos a realizar: en edición se reordenan arrastrando. */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Procedimientos programados</p>
          {isEditing ? (
            procedureOrder.length > 0 ? (
              <>
                <p className="mt-1 text-xs text-gray-400">Arrastra para ordenar cómo se realizarán.</p>
                <Reorder.Group axis="y" values={procedureOrder} onReorder={setProcedureOrder} className="mt-1 space-y-1">
                  {procedureOrder.map((procedure, index) => (
                    <Reorder.Item
                      key={procedure.id}
                      value={procedure}
                      className="flex cursor-grab items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm font-medium text-gray-800 shadow-sm active:cursor-grabbing"
                    >
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate">{procedure.nombre}</span>
                      <button
                        type="button"
                        onClick={() => removeProcedure(procedure.id)}
                        onPointerDown={pointerEvent => pointerEvent.stopPropagation()}
                        title="Eliminar procedimiento"
                        className="shrink-0 rounded-md p-0.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </>
            ) : (
              <p className="mt-1 text-sm font-medium text-gray-800">Sin procedimientos</p>
            )
          ) : event.procedures && event.procedures.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {event.procedures.map((procedure, index) => (
                <li key={procedure.id} className="flex items-start gap-1.5 text-sm font-medium text-gray-800">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                    {index + 1}
                  </span>
                  {procedure.nombre}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm font-medium text-gray-800">Sin procedimientos</p>
          )}
        </div>

        {isEditing ? (
          // En edición, el estado se oculta y en su lugar se ofrece eliminar la cita.
          <div className="border-t border-gray-100 pt-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar cita
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar esta cita?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminará la cita de <span className="font-medium">{event.title}</span>. Esta
                    acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Cambiar estado</p>
            <RadioGroup
              defaultValue={status}
              onValueChange={value =>
                onStatusChange(event.event_id, normalizeStatus(value), String(event.description ?? ""))
              }
              className="grid-cols-2"
            >
              {STATUS_OPTIONS.map(option => (
                <div key={option} className="flex items-center gap-2">
                  <RadioGroupItem
                    value={option}
                    id={`${option}-${event.event_id}`}
                    className={STATUS_RADIO_COLOR[option]}
                  />
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
        )}
      </div>

      {/* Ventana para enviar un recordatorio por WhatsApp al paciente. El
          z-index se sube por encima del popover del scheduler (MUI, z-1300). */}
      <VentanaPopup
        open={whatsappOpen}
        onOpenChange={setWhatsappOpen}
        title="Recordar cita por WhatsApp"
        subtitle={event.title}
        icon={WhatsappIcon}
        hideWindowControls
        contentClassName="z-[1400] sm:max-w-md"
        overlayClassName="z-[1400]"
        footer={
          <>
            <button
              type="button"
              onClick={() => setWhatsappOpen(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={sendWhatsapp}
              disabled={!whatsappMessage.trim() || !whatsappNumber}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <WhatsappIcon className="h-4 w-4" />
              Enviar
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
            Mensaje para el paciente
          </label>
          <textarea
            value={whatsappMessage}
            onChange={textareaEvent => setWhatsappMessage(textareaEvent.target.value)}
            rows={5}
            placeholder="Escribe el mensaje de recordatorio…"
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {whatsappNumber ? (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Se enviará por WhatsApp al número {patientPhone}.
            </p>
          ) : (
            <p className="text-xs text-red-500">Este paciente no tiene un teléfono válido registrado.</p>
          )}
        </div>
      </VentanaPopup>

      {/* Panel de nota: ventana propia (Radix Dialog) posicionada a la derecha
          del popover de detalles, para no competir por el ancho ni desplazarlo. */}
      <DialogPrimitive.Root open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogPrimitive.Portal>
          {/* Overlay transparente que capta el clic fuera para cerrar. */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-[1390] bg-transparent" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            style={{
              position: "fixed",
              left: noteCoords?.left ?? 0,
              top: noteCoords?.top ?? 0,
              width: 260,
              zIndex: 1400,
            }}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl outline-none dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
              <DialogPrimitive.Title asChild>
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                  Agrega una nota para esta cita
                </p>
              </DialogPrimitive.Title>
              <button
                type="button"
                onClick={() => setNoteDraft("")}
                disabled={!noteDraft}
                title="Borrar la nota"
                className="shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-900/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="px-3 py-2">
              <textarea
                value={noteDraft}
                onChange={textareaEvent => setNoteDraft(textareaEvent.target.value)}
                rows={4}
                autoFocus
                placeholder="Escribe una nota para esta cita…"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-3 py-2 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={addNote}
                className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-600"
              >
                Agregar
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
