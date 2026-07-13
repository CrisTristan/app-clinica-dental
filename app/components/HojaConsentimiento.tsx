"use client"

import { PointerEvent, useCallback, useEffect, useRef, useState } from "react"
import {
  Building2,
  Check,
  Eraser,
  FileSignature,
  ImagePlus,
  ListChecks,
  Plus,
  Printer,
  Stethoscope,
  Trash2,
  User,
} from "lucide-react"

// Un procedimiento a realizar dentro de la hoja de consentimiento.
// `detalle` es opcional: solo se muestra en la hoja cuando tiene texto.
type Procedimiento = {
  id: string
  nombre: string
  detalle: string
}

// Datos que puede rellenar quien prepara la hoja de consentimiento.
// Todos los campos son editables; se pueden precargar con `defaults`.
// Quién firma la hoja: el propio paciente o un tutor responsable.
export type FirmadoPor = "paciente" | "tutor"

export type HojaConsentimientoData = {
  logoUrl: string
  nombreClinica: string
  odontologo: string
  paciente: string
  procedimientos: Procedimiento[]
  firmadoPor: FirmadoPor
  tutorResponsable: string
}

const nuevoProcedimiento = (): Procedimiento => ({
  id: crypto.randomUUID(),
  nombre: "",
  detalle: "",
})

const datosPorDefecto: HojaConsentimientoData = {
  logoUrl: "",
  nombreClinica: "",
  odontologo: "",
  paciente: "",
  procedimientos: [nuevoProcedimiento()],
  firmadoPor: "paciente",
  tutorResponsable: "",
}

const labelClass =
  "block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide"

const inputClass =
  "w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-slate-600 " +
  "bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 " +
  "focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"

const textareaClass =
  "w-full resize-y rounded-lg border border-gray-200 dark:border-slate-600 " +
  "bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 " +
  "focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"

// Texto legal por defecto de la hoja de consentimiento (editable).
export const TEXTO_CONSENTIMIENTO_DEFAULT =
  "Por medio de la presente autorizo al odontólogo y a su equipo a realizar el/los " +
  "procedimiento(s) descrito(s) en este documento. Declaro que se me ha explicado en un " +
  "lenguaje claro y comprensible la naturaleza, los beneficios, los riesgos y las posibles " +
  "alternativas del tratamiento, y que he tenido la oportunidad de resolver todas mis dudas. " +
  "Firmo de manera libre y voluntaria en pleno uso de mis facultades."

const formatFechaLarga = () =>
  new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })

/* ─────────────────────────────────────────────────────────────────────────
   Vista previa del documento (solo lectura).
   Se reutiliza tanto en el editor como en otros módulos (p. ej. la vista de
   tratamientos), rellenándola con los datos correspondientes.
   ───────────────────────────────────────────────────────────────────────── */
export function HojaConsentimientoPreview({
  logoUrl = "",
  nombreClinica,
  odontologo,
  paciente,
  procedimientos,
  textoConsentimiento = TEXTO_CONSENTIMIENTO_DEFAULT,
  firmaDataUrl = "",
  firmadoPor = "paciente",
  tutorResponsable,
  fecha,
  className = "",
}: {
  logoUrl?: string
  nombreClinica?: string | null
  odontologo?: string | null
  paciente?: string | null
  procedimientos: { nombre: string; detalle?: string }[]
  textoConsentimiento?: string
  firmaDataUrl?: string
  firmadoPor?: FirmadoPor
  tutorResponsable?: string | null
  fecha?: string
  className?: string
}) {
  const clinica = (nombreClinica ?? "").trim() || "Nombre de la clínica"
  const doctor = (odontologo ?? "").trim() || "Nombre del odontólogo"
  const patient = (paciente ?? "").trim() || "Nombre del paciente"
  const fechaTexto = fecha ?? formatFechaLarga()
  // Quién firma: el tutor responsable o el propio paciente.
  const esTutor = firmadoPor === "tutor"
  const tutor = (tutorResponsable ?? "").trim() || "Nombre del tutor"
  const firmante = esTutor ? tutor : patient
  const firmanteLabel = esTutor ? "Firma del tutor responsable" : "Firma del paciente"

  return (
    <div className={`consent-sheet space-y-6 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm sm:p-8 ${className}`}>
      {/* Encabezado: logo + nombre de la clínica */}
      <div className="flex flex-col items-center gap-4 border-b-4 border-sky-500 pb-6 text-center sm:flex-row sm:items-center sm:text-left">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-600 bg-gray-50/70 dark:bg-slate-700/40">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo de la clínica" className="h-full w-full object-contain p-1.5" />
          ) : (
            <Building2 className="h-9 w-9 text-gray-300 dark:text-slate-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">
            Hoja de consentimiento informado
          </p>
          <h2 className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-slate-100">{clinica}</h2>
          <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Fecha: {fechaTexto}</p>
        </div>
      </div>

      {/* Odontólogo y paciente */}
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <p className="flex items-start gap-2 text-gray-700 dark:text-slate-200">
          <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
          <span>
            <span className="font-semibold text-gray-900 dark:text-slate-100">Odontólogo: </span>
            {doctor}
          </span>
        </p>
        <p className="flex items-start gap-2 text-gray-700 dark:text-slate-200">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
          <span>
            <span className="font-semibold text-gray-900 dark:text-slate-100">Paciente: </span>
            {patient}
          </span>
        </p>
      </div>

      {/* Declaración de consentimiento */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-slate-200">
        {textoConsentimiento}
      </p>

      {/* Procedimientos a realizar */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
          <ListChecks className="h-4 w-4 text-sky-500" />
          Procedimientos a realizar
        </h3>
        {procedimientos.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 px-4 py-6 text-center text-xs text-gray-400 dark:text-slate-500">
            Sin procedimientos registrados
          </p>
        ) : (
          <ul className="space-y-2">
            {procedimientos.map((proc, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30 p-3"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-sky-100 dark:bg-sky-900/40 text-[11px] font-bold text-sky-600 dark:text-sky-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                    {proc.nombre.trim() || `Procedimiento ${i + 1}`}
                  </p>
                  {proc.detalle?.trim() && (
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-600 dark:text-slate-300">
                      {proc.detalle}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Firma del paciente / tutor */}
      <div className="flex flex-col items-center pt-6">
        {esTutor && (
          <p className="mb-2 text-sm text-gray-700 dark:text-slate-200">
            <span className="font-semibold text-gray-900 dark:text-slate-100">Tutor responsable: </span>
            {tutor}
          </p>
        )}
        <div className="flex h-16 items-end justify-center">
          {firmaDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firmaDataUrl} alt="Firma del paciente o tutor" className="max-h-16 max-w-[220px] object-contain" />
          )}
        </div>
        <div className="w-60 border-t border-gray-400 dark:border-slate-500 pt-2 text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{firmante}</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500">{firmanteLabel}</p>
        </div>
      </div>

      {/* Pie: clínica y odontólogo */}
      <div className="border-t border-gray-200 dark:border-slate-700 pt-4 text-center text-xs text-gray-500 dark:text-slate-400">
        <p className="font-semibold text-gray-700 dark:text-slate-200">{clinica}</p>
        <p>Odontólogo responsable: {doctor}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Formulario de edición (reutilizable). Es un componente controlado:
   el estado vive en el padre y se comunica por callbacks.
   ───────────────────────────────────────────────────────────────────────── */
export function HojaConsentimientoForm({
  data,
  onDataChange,
  textoConsentimiento,
  onTextoConsentimientoChange,
  firmaDataUrl,
  onFirmaDataUrlChange,
  hideOdontologoPaciente = false,
  procedimientosFijos = false,
  className = "",
}: {
  data: HojaConsentimientoData
  onDataChange: (data: HojaConsentimientoData) => void
  textoConsentimiento: string
  onTextoConsentimientoChange: (value: string) => void
  firmaDataUrl: string
  onFirmaDataUrlChange: (value: string) => void
  // Oculta los campos de odontólogo y paciente (p. ej. cuando vienen del tratamiento).
  hideOdontologoPaciente?: boolean
  // Procedimientos fijos: el nombre no se edita ni se agregan/eliminan; solo su detalle.
  procedimientosFijos?: boolean
  className?: string
}) {
  const [logoError, setLogoError] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)

  const setField = <K extends keyof HojaConsentimientoData>(field: K, value: HojaConsentimientoData[K]) =>
    onDataChange({ ...data, [field]: value })

  // Al montar (p. ej. al reabrir el formulario), redibuja la firma guardada.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !firmaDataUrl) return
    const context = canvas.getContext("2d")
    if (!context) return
    const image = new Image()
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.src = firmaDataUrl
    // Solo en el montaje: no queremos redibujar en cada trazo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Logo ── */
  const handleLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = "" // permite volver a elegir el mismo archivo
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setLogoError("Selecciona una imagen válida.")
      return
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setLogoError("El logo debe pesar menos de 1.5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setLogoError("")
      setField("logoUrl", String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  /* ── Procedimientos ── */
  const setProcedimiento = (id: string, field: keyof Omit<Procedimiento, "id">, value: string) =>
    setField(
      "procedimientos",
      data.procedimientos.map(p => (p.id === id ? { ...p, [field]: value } : p))
    )

  const addProcedimiento = () =>
    setField("procedimientos", [...data.procedimientos, nuevoProcedimiento()])

  const removeProcedimiento = (id: string) =>
    setField(
      "procedimientos",
      data.procedimientos.length === 1
        ? data.procedimientos
        : data.procedimientos.filter(p => p.id !== id)
    )

  /* ── Firma (canvas) ── */
  const canvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    const context = canvas.getContext("2d")
    if (!context) return
    const point = canvasPoint(event)
    drawingRef.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const context = canvasRef.current?.getContext("2d")
    if (!context) return
    const point = canvasPoint(event)
    context.lineWidth = 2.4
    context.lineCap = "round"
    context.lineJoin = "round"
    context.strokeStyle = "#0f172a"
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  // Al soltar, guarda la firma como imagen para reflejarla en la vista previa.
  const stopDrawing = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    onFirmaDataUrlChange(canvasRef.current?.toDataURL("image/png") ?? "")
  }

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
    onFirmaDataUrlChange("")
  }, [onFirmaDataUrlChange])

  return (
    <div className={`space-y-5 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm ${className}`}>
      {/* Logo */}
      <div className="space-y-1.5">
        <label className={labelClass}>Logo de la clínica</label>
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/70 dark:bg-slate-700/40">
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt="Logo de la clínica" className="h-full w-full object-contain p-1" />
            ) : (
              <Building2 className="h-6 w-6 text-gray-300 dark:text-slate-500" />
            )}
          </div>
          <div className="space-y-1">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <ImagePlus className="h-3.5 w-3.5" />
              {data.logoUrl ? "Cambiar logo" : "Seleccionar logo"}
              <input type="file" accept="image/*" onChange={handleLogo} className="sr-only" />
            </label>
            {data.logoUrl && (
              <button
                type="button"
                onClick={() => setField("logoUrl", "")}
                className="ml-2 text-[11px] font-semibold text-gray-400 hover:text-rose-500 transition-colors"
              >
                Quitar
              </button>
            )}
            {logoError && <p className="text-[11px] font-semibold text-rose-500">{logoError}</p>}
          </div>
        </div>
      </div>

      {/* Nombre de la clínica */}
      <div className="space-y-1.5">
        <label className={labelClass}>Nombre de la clínica</label>
        <input
          value={data.nombreClinica}
          onChange={e => setField("nombreClinica", e.target.value)}
          placeholder="Nombre de la clínica"
          className={inputClass}
        />
      </div>

      {/* Odontólogo y paciente */}
      {!hideOdontologoPaciente && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={`${labelClass} flex items-center gap-1.5`}>
              <Stethoscope className="h-3.5 w-3.5" />
              Odontólogo
            </label>
            <input
              value={data.odontologo}
              onChange={e => setField("odontologo", e.target.value)}
              placeholder="Nombre del odontólogo"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={`${labelClass} flex items-center gap-1.5`}>
              <User className="h-3.5 w-3.5" />
              Paciente
            </label>
            <input
              value={data.paciente}
              onChange={e => setField("paciente", e.target.value)}
              placeholder="Nombre del paciente"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Procedimientos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Procedimientos ({data.procedimientos.length})
            </h2>
          </div>
          {!procedimientosFijos && (
            <button
              type="button"
              onClick={addProcedimiento}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </button>
          )}
        </div>

        <ul className="space-y-3">
          {data.procedimientos.map((proc, i) => (
            <li
              key={proc.id}
              className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30 p-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-sky-100 dark:bg-sky-900/40 text-[11px] font-bold text-sky-600 dark:text-sky-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  {procedimientosFijos ? (
                    <p className="px-1 py-1.5 text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {proc.nombre.trim() || `Procedimiento ${i + 1}`}
                    </p>
                  ) : (
                    <input
                      value={proc.nombre}
                      onChange={e => setProcedimiento(proc.id, "nombre", e.target.value)}
                      placeholder="Nombre del procedimiento"
                      aria-label={`Procedimiento ${i + 1}`}
                      className={inputClass}
                    />
                  )}
                  <textarea
                    value={proc.detalle}
                    onChange={e => setProcedimiento(proc.id, "detalle", e.target.value)}
                    rows={2}
                    placeholder={
                      procedimientosFijos
                        ? "Detalles del procedimiento y riesgos asociados…"
                        : "Detalle del procedimiento (opcional)…"
                    }
                    aria-label={`Detalle del procedimiento ${i + 1}`}
                    className={textareaClass}
                  />
                </div>
                {!procedimientosFijos && (
                  <button
                    type="button"
                    onClick={() => removeProcedimiento(proc.id)}
                    disabled={data.procedimientos.length === 1}
                    aria-label={`Eliminar procedimiento ${i + 1}`}
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Declaración de consentimiento */}
      <div className="space-y-1.5">
        <label className={labelClass}>Declaración de consentimiento</label>
        <textarea
          value={textoConsentimiento}
          onChange={e => onTextoConsentimientoChange(e.target.value)}
          rows={5}
          className={textareaClass}
        />
      </div>

      {/* Firmado por: paciente o tutor */}
      <div className="space-y-1.5">
        <label className={labelClass}>Firmado por</label>
        <div className="flex gap-2">
          {([
            { v: "paciente", label: "Paciente" },
            { v: "tutor", label: "Tutor" },
          ] as const).map(opt => {
            const active = data.firmadoPor === opt.v
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => setField("firmadoPor", opt.v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors
                  ${active
                    ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                    : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
              >
                {active && <Check className="h-3.5 w-3.5" />}
                {opt.label}
              </button>
            )
          })}
        </div>
        {data.firmadoPor === "tutor" && (
          <div className="space-y-1.5 pt-1">
            <label className={labelClass}>Tutor responsable</label>
            <input
              value={data.tutorResponsable}
              onChange={e => setField("tutorResponsable", e.target.value)}
              placeholder="Nombre del tutor responsable"
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* Firma del paciente / tutor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={`${labelClass} flex items-center gap-1.5`}>
            <FileSignature className="h-3.5 w-3.5" />
            Firma del paciente / tutor
          </label>
          <button
            type="button"
            onClick={clearSignature}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-rose-500 transition-colors"
          >
            <Eraser className="h-3.5 w-3.5" />
            Limpiar
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={520}
          height={200}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
          className="h-[150px] w-full touch-none rounded-xl border border-gray-200 dark:border-slate-600 bg-white"
          aria-label="Área para dibujar la firma del paciente o tutor"
        />
        <p className="text-[10px] text-gray-400 dark:text-slate-500">
          Dibuja con el mouse, lápiz digital o dedo.
        </p>
      </div>
    </div>
  )
}

// Crea el estado inicial del documento a partir de datos parciales (p. ej. de un tratamiento).
export const crearHojaConsentimientoData = (
  defaults?: Partial<HojaConsentimientoData>
): HojaConsentimientoData => ({
  ...datosPorDefecto,
  ...defaults,
  procedimientos: defaults?.procedimientos?.length
    ? defaults.procedimientos
    : datosPorDefecto.procedimientos,
})

/* ─────────────────────────────────────────────────────────────────────────
   Editor completo: edición a la izquierda, vista previa en vivo a la derecha.
   ───────────────────────────────────────────────────────────────────────── */
export default function HojaConsentimiento({
  defaults,
}: {
  defaults?: Partial<HojaConsentimientoData>
}) {
  const [data, setData] = useState<HojaConsentimientoData>(() => crearHojaConsentimientoData(defaults))
  const [textoConsentimiento, setTextoConsentimiento] = useState(TEXTO_CONSENTIMIENTO_DEFAULT)
  const [firmaDataUrl, setFirmaDataUrl] = useState("")

  return (
    <div className="hoja-module mx-auto max-w-6xl space-y-5">
      {/* ── Barra de acciones (no se imprime) ── */}
      <div className="no-print flex items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm">
            <FileSignature className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-slate-100">
              Hoja de consentimiento
            </h1>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Edita a la izquierda y revisa la vista previa a la derecha.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 rounded-xl shadow-sm transition-all"
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
      </div>

      <div className="hoja-grid grid items-start gap-5 lg:grid-cols-2">
        {/* ══════════ Columna izquierda: formulario de edición ══════════ */}
        <HojaConsentimientoForm
          className="no-print"
          data={data}
          onDataChange={setData}
          textoConsentimiento={textoConsentimiento}
          onTextoConsentimientoChange={setTextoConsentimiento}
          firmaDataUrl={firmaDataUrl}
          onFirmaDataUrlChange={setFirmaDataUrl}
        />

        {/* ══════════ Columna derecha: vista previa en vivo ══════════ */}
        <div className="preview-column lg:sticky lg:top-6">
          <p className="no-print mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
            Vista previa
          </p>
          <HojaConsentimientoPreview
            logoUrl={data.logoUrl}
            nombreClinica={data.nombreClinica}
            odontologo={data.odontologo}
            paciente={data.paciente}
            procedimientos={data.procedimientos}
            textoConsentimiento={textoConsentimiento}
            firmaDataUrl={firmaDataUrl}
            firmadoPor={data.firmadoPor}
            tutorResponsable={data.tutorResponsable}
          />
        </div>
      </div>

      {/* Reglas de impresión: solo se imprime la vista previa, no el formulario */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          body > header,
          .no-print {
            display: none !important;
          }
          .hoja-grid {
            display: block !important;
          }
          .preview-column {
            position: static !important;
          }
          .consent-sheet {
            border: 0 !important;
            box-shadow: none !important;
          }
          @page {
            size: letter portrait;
            margin: 14mm;
          }
        }
      `}</style>
    </div>
  )
}
