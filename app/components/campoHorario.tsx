"use client";

import { useEffect, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from "react";
import { format, setHours, setMinutes } from "date-fns";

const clampTimePart = (text: string, max: number) => Math.min(Math.max(Number(text) || 0, 0), max);

const padTimePart = (value: number) => String(value).padStart(2, "0");

interface CampoHorarioProps {
  /** Horario que muestra el campo; sus dos casillas se editan al hacer clic. */
  value: Date;
  /** Recibe la misma fecha con la hora y los minutos ya normalizados. */
  onChange: (value: Date) => void;
  disabled?: boolean;
  /** Nombre accesible del campo; se reparte entre la casilla de horas y la de minutos. */
  label?: string;
}

/* ─────────────────────────────────────────────────────────────────────────
   Campo de horario "HH : mm" en dos casillas editables. Pensado para las
   cabeceras de fondo degradado, así que su texto y su borde son blancos.
   ───────────────────────────────────────────────────────────────────────── */

export default function CampoHorario({
  value,
  onChange,
  disabled = false,
  label = "Horario",
}: CampoHorarioProps) {
  const [hoursText, setHoursText] = useState(format(value, "HH"));
  const [minutesText, setMinutesText] = useState(format(value, "mm"));

  // El horario también cambia por fuera del campo (al mover o estirar la cita en el calendario).
  useEffect(() => {
    setHoursText(format(value, "HH"));
    setMinutesText(format(value, "mm"));
  }, [value]);

  // Mientras se teclea, el texto se deja tal cual y solo se normaliza al salir
  // del campo: así se puede borrar y escribir con libertad, y un solo dígito
  // ("8") se completa a "08" recién al terminar. Normalizar antes obligaría a
  // adivinar qué está a medio escribir.
  const commit = () => {
    const hours = clampTimePart(hoursText, 23);
    const minutes = clampTimePart(minutesText, 59);
    setHoursText(padTimePart(hours));
    setMinutesText(padTimePart(minutes));
    onChange(setMinutes(setHours(value, hours), minutes));
  };

  const handleChange = (setText: (text: string) => void) => (inputEvent: ChangeEvent<HTMLInputElement>) =>
    setText(inputEvent.target.value.replace(/\D/g, "").slice(0, 2));

  const inputProps = {
    inputMode: "numeric" as const,
    disabled,
    onFocus: (inputEvent: FocusEvent<HTMLInputElement>) => inputEvent.target.select(),
    onBlur: commit,
    onKeyDown: (keyEvent: KeyboardEvent<HTMLInputElement>) =>
      keyEvent.key === "Enter" && keyEvent.currentTarget.blur(),
    className: "w-full bg-transparent text-center text-xs font-semibold text-white outline-none disabled:opacity-60",
  };

  return (
    <div className="grid grid-cols-[1.5rem_0.25rem_1.5rem] items-center gap-1 rounded-lg border border-white/50 bg-white/10 px-2 py-0.5 transition focus-within:border-white focus-within:bg-white/20">
      <input
        {...inputProps}
        value={hoursText}
        onChange={handleChange(setHoursText)}
        aria-label={`${label}: horas`}
      />
      <span className="text-center text-xs font-semibold text-white/70">:</span>
      <input
        {...inputProps}
        value={minutesText}
        onChange={handleChange(setMinutesText)}
        aria-label={`${label}: minutos`}
      />
    </div>
  );
}
