"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ArrowLeft, Minus, Square, X, ChevronRight } from "lucide-react"

/* ─────────────────────────────────────────────────────────────────────────
   Ventana tipo popup reutilizable con tres secciones: encabezado, cuerpo y
   pie. Pensada para renderizar cualquier componente dentro del cuerpo.

   • Encabezado: botón para regresar a la vista previa (opcional), controles de
     ventana estilo escritorio (minimizar, maximizar a pantalla completa y
     cerrar), título, subtítulo y una zona de "botones de acción".
   • Cuerpo: solo se encarga de tener scroll vertical; el contenido lo pones tú.
   • Pie: un botón "Continuar" para avanzar a la siguiente vista (opcional).

   El ancho de la ventana es configurable con `contentClassName` (p. ej.
   "sm:max-w-3xl") y puede cambiar entre vistas sin problemas.
   ───────────────────────────────────────────────────────────────────────── */

// Entrada/salida por defecto: la ventana aparece centrada con un deslizamiento
// mínimo (el -50% / -48% empareja con `translate-x/y-[-50%]` de la posición).
// Se separa del resto de clases porque tailwind-merge no conoce las utilidades
// de tailwindcss-animate y no sabría descartar las que sobran: para cambiar la
// dirección hay que reemplazar la cadena completa vía `animationClassName`.
const DEFAULT_ANIMATION =
  "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] " +
  "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"

export type VentanaPopupProps = {
  /** Estado abierto/cerrado (controlado). */
  open: boolean
  onOpenChange: (open: boolean) => void

  /** Disparador opcional (se envuelve en DialogTrigger asChild). */
  trigger?: React.ReactNode

  /** Encabezado. */
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Ícono a la izquierda del título. */
  icon?: React.ElementType
  /** Si se pasa, muestra el botón "atrás" para regresar a la vista previa. */
  onBack?: () => void
  backTitle?: string
  /** Zona de "botones de acción" del encabezado (editar, imprimir, guardar…). */
  actions?: React.ReactNode

  /** Cuerpo: cualquier componente. Solo se garantiza el scroll vertical. */
  children: React.ReactNode

  /**
   * Pie con botón "Continuar". Si se omite `onContinue` (y no se pasa
   * `footer`), no se renderiza el pie.
   */
  onContinue?: () => void
  continueLabel?: React.ReactNode
  continueDisabled?: boolean
  continueLoading?: boolean
  /** Pie totalmente personalizado; tiene prioridad sobre el botón "Continuar". */
  footer?: React.ReactNode

  /** Clases extra para la ventana (ancho, etc.). Ej: "sm:max-w-3xl". */
  contentClassName?: string
  /**
   * Reemplaza las animaciones de entrada/salida (`slide-in-from-*` /
   * `slide-out-to-*`) cuando la ventana no aparece centrada. Ojo: deben
   * incluirse ambos ejes, porque el fotograma inicial sustituye por completo al
   * `transform` del elemento.
   */
  animationClassName?: string
  /** Clases extra para el overlay (p. ej. subir el z-index sobre otro modal). */
  overlayClassName?: string
  /** Clases extra para el área del cuerpo. */
  bodyClassName?: string

  /**
   * Reemplaza las clases de la ventana cuando está maximizada. Por defecto
   * ocupa toda la pantalla; pásalo para que ocupe, p. ej., solo 2/3 y deje
   * espacio a otra ventana al lado.
   */
  maximizedClassName?: string
  /** Se dispara cuando cambia el estado maximizado/normal de la ventana. */
  onMaximizedChange?: (maximized: boolean) => void

  /** Ref al contenedor de la ventana (p. ej. para medir su alto). */
  contentRef?: React.Ref<HTMLDivElement>
  /** Estilos en línea para el contenedor (p. ej. fijar un alto calculado). */
  contentStyle?: React.CSSProperties

  /** Oculta los controles de ventana (minimizar / maximizar). */
  hideWindowControls?: boolean
}

export default function VentanaPopup({
  open,
  onOpenChange,
  trigger,
  title,
  subtitle,
  icon: Icon,
  onBack,
  backTitle = "Volver",
  actions,
  children,
  onContinue,
  continueLabel = "Continuar",
  continueDisabled = false,
  continueLoading = false,
  footer,
  contentClassName = "sm:max-w-2xl",
  animationClassName = DEFAULT_ANIMATION,
  overlayClassName,
  bodyClassName,
  maximizedClassName = "h-screen max-h-screen w-screen max-w-none rounded-none",
  onMaximizedChange,
  contentRef,
  contentStyle,
  hideWindowControls = false,
}: VentanaPopupProps) {
  // Estado de ventana estilo escritorio: maximizada (pantalla completa) o normal.
  const [maximized, setMaximized] = React.useState(false)

  // Avisa al contenedor cuando cambia el tamaño (para reordenar su layout). Se
  // usa un ref para el callback y así disparar solo cuando `maximized` cambia,
  // sin depender de la identidad de la función.
  const onMaximizedChangeRef = React.useRef(onMaximizedChange)
  onMaximizedChangeRef.current = onMaximizedChange
  React.useEffect(() => {
    onMaximizedChangeRef.current?.(maximized)
  }, [maximized])

  // Al cerrar, restablece el tamaño para la próxima apertura.
  const handleOpenChange = (o: boolean) => {
    if (!o) setMaximized(false)
    onOpenChange(o)
  }

  const showFooter = footer !== undefined || onContinue !== undefined

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPortal>
        <DialogOverlay className={overlayClassName} />
        <DialogPrimitive.Content
          ref={contentRef}
          style={contentStyle}
          className={cn(
            // Posición y animaciones idénticas al Dialog de shadcn: entrada
            // centrada con fade + zoom + slide sutil hacia el centro.
            "fixed left-[50%] top-[50%] z-50 flex translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden",
            "border border-gray-100 bg-white shadow-lg outline-none dark:border-slate-700 dark:bg-slate-800",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            animationClassName,
            "w-full",
            maximized
              ? maximizedClassName
              : cn("max-h-[85vh] rounded-none sm:rounded-lg", contentClassName)
          )}
        >
          {/* ══════════════════ Encabezado ══════════════════ */}
          <header className="shrink-0 border-b border-gray-100 dark:border-slate-700 px-5 pt-4 pb-3">
            {/* Fila superior: atrás (izq.) + controles de ventana (der.) */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {onBack && (
                    <button
                      type="button"
                      onClick={onBack}
                      title={backTitle}
                      aria-label={backTitle}
                      className="shrink-0 -ml-1 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-sky-600 dark:hover:bg-slate-700 dark:hover:text-sky-400"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  {Icon && <Icon className="h-4 w-4 shrink-0 text-sky-500" />}
                  <DialogPrimitive.Title asChild>
                    <span className="truncate text-base font-semibold tracking-tight text-gray-800 dark:text-slate-100">
                      {title}
                    </span>
                  </DialogPrimitive.Title>
                </div>

                {/* Controles de ventana: minimizar, maximizar, cerrar. */}
                <div className="flex shrink-0 items-center gap-1">
                  {!hideWindowControls && (
                    <>
                      {/* Minimizar: regresa la ventana a su tamaño normal. */}
                      <button
                        type="button"
                        onClick={() => setMaximized(false)}
                        disabled={!maximized}
                        title="Tamaño normal"
                        aria-label="Tamaño normal"
                        className="rounded-sm p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-400 disabled:pointer-events-none disabled:opacity-30"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      {/* Maximizar: pantalla completa. Se bloquea si ya está maximizada. */}
                      <button
                        type="button"
                        onClick={() => setMaximized(true)}
                        disabled={maximized}
                        title="Pantalla completa"
                        aria-label="Pantalla completa"
                        className="rounded-sm p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-400 disabled:pointer-events-none disabled:opacity-30"
                      >
                        <Square className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <DialogPrimitive.Close
                    title="Cerrar"
                    aria-label="Cerrar"
                    className="rounded-sm p-1 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </DialogPrimitive.Close>
                </div>
              </div>

              {/* Subtítulo */}
              {subtitle && (
                <DialogPrimitive.Description asChild>
                  <p className="mt-1 truncate text-sm text-gray-400 dark:text-slate-500">
                    {subtitle}
                  </p>
                </DialogPrimitive.Description>
              )}

              {/* Zona de botones de acción */}
              {actions && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {actions}
                </div>
              )}
          </header>

          {/* ══════════════════ Cuerpo (scroll vertical) ══════════════════ */}
          <div className={cn("flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>
            {children}
          </div>

          {/* ══════════════════ Pie ══════════════════ */}
          {showFooter && (
            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 dark:border-slate-700 px-5 py-3">
              {footer !== undefined ? (
                footer
              ) : (
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={continueDisabled || continueLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {continueLoading ? "Procesando…" : continueLabel}
                  {!continueLoading && <ChevronRight className="h-4 w-4" />}
                </button>
              )}
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  )
}
