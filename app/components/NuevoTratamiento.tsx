"use client"

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Stethoscope, Square, Minus, Plus, TrendingUp, Check, ListChecks, X, GripVertical, ArrowRight, ArrowLeft, FileText } from "lucide-react"
import { Reorder } from "framer-motion"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import SearchableSelect from "./SearchableSelect"

type Treatment = { id: number; nombre: string }
// `precio` y `custom` solo aplican a procedimientos capturados a mano por el
// odontólogo (los que no están en el catálogo). `cantidad` es cuántas veces se
// realizará el procedimiento (mínimo 1).
type Procedure = { catalog_key: string; nombre: string; precio?: string; custom?: boolean; cantidad: number }

const labelClass =
  "block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide"

/* ── Modal para iniciar un plan de tratamiento del paciente ── */
export default function NuevoTratamiento({ id }: { id: string | null }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [maximized, setMaximized] = useState(false)
  // Paso 1: tratamiento. Paso 2: procedimientos y precios. Paso 3: resumen.
  const [step, setStep] = useState<1 | 2 | 3>(1)
  // ¿Generar una nueva hoja de consentimiento al finalizar?
  const [generarConsentimiento, setGenerarConsentimiento] = useState(true)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState("")

  // Catálogo de procedimientos + los que el odontólogo va agregando al plan.
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [procLoading, setProcLoading] = useState(false)
  const [procLoaded, setProcLoaded] = useState(false)
  const [chosenProcs, setChosenProcs] = useState<Procedure[]>([])

  // Formulario para capturar un procedimiento que no está en el catálogo.
  const [customName, setCustomName] = useState("")
  const [customPrice, setCustomPrice] = useState("")

  // Los 5 tratamientos más realizados por el odontólogo (aún sin datos).
  const masUsados: Treatment[] = []

  // Catálogo de tratamientos: se carga la primera vez que se abre la lista
  // para no consultar la base de datos si el modal nunca se usa.
  const loadTreatments = () => {
    if (loaded || loading) return
    setLoading(true)
    fetch("/api/dental-treatments")
      .then(r => r.json())
      .then(d => {
        setTreatments(d.treatments ?? [])
        setLoaded(true)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const treatmentOpts = useMemo(
    () => treatments.map(t => ({ value: String(t.id), label: t.nombre })),
    [treatments],
  )

  const selectedName = treatments.find(t => String(t.id) === selected)?.nombre ?? ""

  // Catálogo de procedimientos: se carga la primera vez que se abre la lista.
  const loadProcedures = () => {
    if (procLoaded || procLoading) return
    setProcLoading(true)
    fetch("/api/dental-procedures")
      .then(r => r.json())
      .then(d => {
        setProcedures(d.procedures ?? [])
        setProcLoaded(true)
      })
      .catch(console.error)
      .finally(() => setProcLoading(false))
  }

  // Solo se ofrecen los procedimientos que aún no están en el plan.
  const procedureOpts = useMemo(
    () => procedures
      .filter(p => !chosenProcs.some(c => c.catalog_key === p.catalog_key))
      .map(p => ({ value: p.catalog_key, label: p.nombre })),
    [procedures, chosenProcs],
  )

  const addProcedure = (key: string) => {
    const proc = procedures.find(p => p.catalog_key === key)
    if (!proc || chosenProcs.some(c => c.catalog_key === key)) return
    setChosenProcs(prev => [...prev, { ...proc, cantidad: 1 }])
  }

  const removeProcedure = (key: string) => {
    setChosenProcs(prev => prev.filter(c => c.catalog_key !== key))
  }

  const setProcedurePrice = (key: string, precio: string) => {
    setChosenProcs(prev => prev.map(c =>
      c.catalog_key === key ? { ...c, precio: precio || undefined } : c
    ))
  }

  const setProcedureQty = (key: string, cantidad: number) => {
    // La cantidad nunca baja de 1.
    setChosenProcs(prev => prev.map(c =>
      c.catalog_key === key ? { ...c, cantidad: Math.max(1, cantidad) } : c
    ))
  }

  // Total del plan: suma de precio × cantidad (los sin precio cuentan 0).
  const total = useMemo(
    () => chosenProcs.reduce((sum, p) => sum + (parseFloat(p.precio ?? "") || 0) * p.cantidad, 0),
    [chosenProcs],
  )

  const addCustomProcedure = () => {
    const nombre = customName.trim()
    if (!nombre) return
    const precio = customPrice.trim()
    setChosenProcs(prev => [...prev, {
      catalog_key: `custom-${crypto.randomUUID()}`,
      nombre,
      precio: precio || undefined,
      custom: true,
      cantidad: 1,
    }])
    setCustomName("")
    setCustomPrice("")
  }

  // Deja el modal listo para un nuevo plan.
  const reset = () => {
    setStep(1)
    setSelected("")
    setChosenProcs([])
    setCustomName("")
    setCustomPrice("")
    setGenerarConsentimiento(true)
  }

  const handleFinalizar = async () => {
    if (!id || !selected || chosenProcs.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/treatment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: Number(id),
          treatmentId: Number(selected),
          total,
          generarConsentimiento,
          procedures: chosenProcs.map(p => ({
            nombre: p.nombre,
            catalog_key: p.catalog_key,
            custom: p.custom ?? false,
            cantidad: p.cantidad,
            precio: p.precio ?? null,
          })),
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => null)
        throw new Error(b?.error || `Error ${res.status}`)
      }
      toast({ title: "Plan de tratamiento guardado" })
      reset()
      setOpen(false)
    } catch (e) {
      toast({
        title: "Error al guardar el plan",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-sky-600 dark:text-sky-400
                     bg-white/90 dark:bg-slate-800/80 border border-sky-200 dark:border-sky-800
                     rounded-xl shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nuevo tratamiento
        </button>
      </DialogTrigger>
      <DialogContent
        className={
          (maximized
            ? "w-screen max-w-none h-screen max-h-screen rounded-none sm:rounded-none overflow-y-auto"
            : "sm:max-w-2xl") +
          " bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700"
        }
      >
        {/* Controles de ventana estilo Windows (agrandar / reducir), a la izquierda de la "X" (salir) */}
        <div className="absolute right-11 top-4 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMaximized(true)}
            disabled={maximized}
            title="Agrandar"
            className="rounded-sm p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-400 disabled:pointer-events-none disabled:opacity-30"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMaximized(false)}
            disabled={!maximized}
            title="Reducir"
            className="rounded-sm p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-400 disabled:pointer-events-none disabled:opacity-30"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
        <DialogHeader className="pr-28">
          <DialogTitle className="flex items-center gap-2 text-gray-800 dark:text-slate-100">
            <Stethoscope className="w-4 h-4 text-sky-500" />
            Inicia un plan de tratamiento
          </DialogTitle>
          <DialogDescription className="text-gray-400 dark:text-slate-500">
            {step === 1
              ? "Elige el tratamiento a realizar"
              : step === 2
              ? "Agrega los procedimientos dentales y asigna su precio"
              : "Revisa el resumen del plan de tratamiento"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Paso 1: selección ── */}
        {step === 1 && (
        <div className="space-y-6 pt-2">
          {/* Selector de tratamiento */}
          <div className="space-y-1.5">
            <label className={labelClass}>¿Qué tratamiento quieres realizar?</label>
            <SearchableSelect
              name="tratamiento"
              options={treatmentOpts}
              value={selected}
              onChange={setSelected}
              onOpen={loadTreatments}
              loading={loading}
              placeholder="Buscar tratamiento…"
              direction="up"
            />
            {selectedName && (
              <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-sky-600 dark:text-sky-400">
                <Check className="w-3.5 h-3.5" />
                Seleccionado: {selectedName}
              </p>
            )}
          </div>

          {/* Tratamientos más usados */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Tratamientos más usados</h3>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Los 5 procedimientos que más realizas, para asignarlos con un clic.
            </p>

            {masUsados.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 py-8 text-center">
                <TrendingUp className="w-6 h-6 text-gray-200 dark:text-slate-700" />
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Aún no hay estadísticas de uso
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {masUsados.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelected(String(t.id))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 dark:border-sky-800
                               bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-300
                               hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {t.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
        )}

        {/* ── Paso 2: procedimientos dentales ── */}
        {step === 2 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Procedimientos dentales a realizar</h3>
          </div>

          <SearchableSelect
            name="procedimiento"
            options={procedureOpts}
            value=""
            onChange={addProcedure}
            onOpen={loadProcedures}
            loading={procLoading}
            placeholder="Buscar y agregar procedimiento…"
            emptyText={procLoaded ? "Sin procedimientos disponibles" : "Sin coincidencias"}
            direction="down"
          />

          {/* Captura manual: para procedimientos que no están en el catálogo */}
          <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/40 dark:bg-slate-700/30 p-3 space-y-2">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                ¿Agregar otro procedimiento?
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Este procedimiento se almacenará para futuros tratamientos.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomProcedure() } }}
                placeholder="Nombre del procedimiento"
                className="h-9 text-sm flex-1"
              />
              <Input
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomProcedure() } }}
                placeholder="Precio (opcional)"
                type="number"
                min="0"
                className="h-9 text-sm sm:w-36"
              />
              <button
                type="button"
                onClick={addCustomProcedure}
                disabled={!customName.trim()}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 shrink-0 text-sm font-medium
                           text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </div>

          {/* Zona con los procedimientos seleccionados (con precio) */}
          {chosenProcs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 py-8 text-center">
              <ListChecks className="w-6 h-6 text-gray-200 dark:text-slate-700" />
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Aún no has agregado procedimientos
              </p>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={chosenProcs}
              onReorder={setChosenProcs}
              className="space-y-1.5"
            >
              {chosenProcs.map((p, i) => (
                <Reorder.Item
                  key={p.catalog_key}
                  value={p}
                  className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-slate-700
                             bg-gray-50/60 dark:bg-slate-700/40 px-3 py-2 cursor-grab active:cursor-grabbing
                             select-none"
                  whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}
                >
                  <GripVertical className="w-4 h-4 shrink-0 text-gray-300 dark:text-slate-500" />
                  <span className="grid place-items-center w-6 h-6 shrink-0 rounded-lg bg-sky-100 dark:bg-sky-900/40
                                   text-[11px] font-bold text-sky-600 dark:text-sky-300">
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm text-gray-700 dark:text-slate-200">{p.nombre}</span>
                  {/* Cantidad con botones +/- */}
                  <div
                    className="flex shrink-0 items-center rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setProcedureQty(p.catalog_key, p.cantidad - 1)}
                      disabled={p.cantidad <= 1}
                      title="Reducir cantidad"
                      className="grid h-8 w-7 place-items-center text-gray-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={p.cantidad}
                      onChange={e => setProcedureQty(p.catalog_key, parseInt(e.target.value, 10) || 1)}
                      className="h-8 w-9 border-x border-gray-200 dark:border-slate-600 bg-transparent text-center text-sm tabular-nums text-gray-800 dark:text-slate-100 focus:outline-none
                                 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setProcedureQty(p.catalog_key, p.cantidad + 1)}
                      title="Aumentar cantidad"
                      className="grid h-8 w-7 place-items-center text-gray-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div
                    className="relative shrink-0 w-28"
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500">$</span>
                    <Input
                      value={p.precio ?? ""}
                      onChange={e => setProcedurePrice(p.catalog_key, e.target.value)}
                      placeholder="0.00"
                      type="number"
                      min="0"
                      className="h-8 pl-5 text-sm tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => removeProcedure(p.catalog_key)}
                    title="Eliminar procedimiento"
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500
                               dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl border border-sky-100 dark:border-sky-900/50
                          bg-sky-50/60 dark:bg-sky-900/20 px-4 py-3">
            <span className="text-sm font-semibold text-gray-600 dark:text-slate-300">Total</span>
            <span className="text-lg font-bold text-sky-700 dark:text-sky-300 tabular-nums">
              ${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        )}

        {/* ── Paso 3: resumen del plan ── */}
        {step === 3 && (
        <div className="space-y-5 pt-2">
          {/* Tratamiento seleccionado */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Tratamiento</h3>
            </div>
            <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-700/40 px-4 py-2.5">
              <span className="text-sm font-medium text-gray-800 dark:text-slate-100">
                {selectedName || "Sin tratamiento seleccionado"}
              </span>
            </div>
          </div>

          {/* Procedimientos */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Procedimientos ({chosenProcs.length})
              </h3>
            </div>
            <ul className="rounded-xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700 overflow-hidden">
              {chosenProcs.map((p, i) => {
                const precio = parseFloat(p.precio ?? "") || 0
                return (
                  <li key={p.catalog_key} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50/40 dark:bg-slate-700/30">
                    <span className="grid place-items-center w-6 h-6 shrink-0 rounded-lg bg-sky-100 dark:bg-sky-900/40
                                     text-[11px] font-bold text-sky-600 dark:text-sky-300">
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm text-gray-700 dark:text-slate-200">{p.nombre}</span>
                    <span className="shrink-0 text-xs text-gray-400 dark:text-slate-500 tabular-nums">
                      {p.cantidad} × ${precio.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="shrink-0 w-24 text-right text-sm font-semibold text-gray-700 dark:text-slate-200 tabular-nums">
                      ${(precio * p.cantidad).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl border border-sky-100 dark:border-sky-900/50
                          bg-sky-50/60 dark:bg-sky-900/20 px-4 py-3">
            <span className="text-sm font-semibold text-gray-600 dark:text-slate-300">Total</span>
            <span className="text-lg font-bold text-sky-700 dark:text-sky-300 tabular-nums">
              ${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Hoja de consentimiento */}
          <div className="space-y-2 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Hoja de consentimiento</h3>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              ¿Deseas generar una nueva hoja de consentimiento para este tratamiento?
            </p>
            <div className="flex gap-2 pt-1">
              {[{ v: true, label: "Sí, generar" }, { v: false, label: "No, por ahora" }].map(opt => {
                const active = generarConsentimiento === opt.v
                return (
                  <button
                    key={String(opt.v)}
                    type="button"
                    onClick={() => setGenerarConsentimiento(opt.v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                      ${active
                        ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                        : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        )}

        {/* ── Navegación entre pasos ── */}
        <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-gray-100 dark:border-slate-700">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300
                         bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
          ) : <span />}

          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
              disabled={(step === 1 && !selected) || (step === 2 && chosenProcs.length === 0)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white
                         bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                         rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleFinalizar}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white
                         bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                         rounded-xl shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {submitting ? "Guardando…" : "Finalizar"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
