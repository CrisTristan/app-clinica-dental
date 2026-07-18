"use client"

import { useState, useRef, useEffect, useMemo, useLayoutEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Check, Plus } from "lucide-react"

export type Option = { value: string; label: string; badge?: string }

// Normaliza para comparar sin acentos ni mayúsculas (útil para "México", etc.).
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

// Alto máximo de la lista (equivale a max-h-56 = 14rem = 224px). Se usa para
// evitar que la lista desplegada hacia los lados se corte por abajo.
const LIST_MAX_HEIGHT = 224

// Select con búsqueda: se escribe a la izquierda para filtrar y se hace clic
// en la flecha de la derecha para desplegar. Reutilizable con cualquier lista
// de opciones { value, label }. La lista puede abrirse hacia arriba, abajo o a
// los lados (right/left); en modo lateral se renderiza en un portal para no
// quedar recortada por contenedores con overflow.
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "— Seleccionar —",
  disabled = false,
  emptyText = "Sin coincidencias",
  name,
  direction = "down",
  displayLabel,
  loading = false,
  onOpen,
  listHeader,
  creatable = false,
  createLabel,
  defaultOpen = false,
}: {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  emptyText?: string
  name?: string
  direction?: "up" | "down" | "right" | "left"
  // Etiqueta a mostrar para el valor actual cuando aún no está en `options`
  // (p. ej. opciones cargadas de forma diferida).
  displayLabel?: string
  loading?: boolean
  // Se dispara al abrir la lista; útil para cargar opciones bajo demanda.
  onOpen?: () => void
  // Contenido fijo en la parte superior de la lista desplegada (p. ej. filtros).
  listHeader?: ReactNode
  // Permite usar texto libre: si lo escrito no coincide con ninguna opción,
  // ofrece "usarlo" como valor personalizado (value === label === texto).
  creatable?: boolean
  createLabel?: (query: string) => ReactNode
  // Arranca con la lista desplegada. Útil cuando el select es lo único que hay
  // que atender al abrir una ventana; el contenedor debe reservar el alto de la
  // lista para que no quede recortada.
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [query, setQuery] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const horizontal = direction === "right" || direction === "left"
  // Posición fija (viewport) de la lista cuando se abre hacia los lados.
  const [coords, setCoords] = useState<{ left: number; top: number; width: number } | null>(null)

  const selected = options.find(o => o.value === value)
  // Nombre visible del valor actual: opción cargada > etiqueta externa.
  const currentLabel = selected?.label ?? (value ? displayLabel ?? "" : "")

  const filtered = useMemo(() => {
    const q = norm(query.trim())
    // Sin texto, o cuando el texto sigue igual a la etiqueta actual (prefijo al
    // abrir el campo), se muestran todas las opciones para poder explorar sin
    // tener que borrar primero.
    if (!q || q === norm(currentLabel)) return options
    return options.filter(o => norm(o.label).includes(q))
  }, [options, query, currentLabel])

  // Cerrar al hacer clic fuera del componente (considera también la lista en portal).
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
      setQuery("")
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])


  // Al abrir hacia los lados, calcula la posición fija a partir del campo y la
  // mantiene sincronizada ante scroll/resize.
  useLayoutEffect(() => {
    if (!open || !horizontal) return

    const update = () => {
      const node = rootRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const gap = 8
      const width = Math.max(rect.width, 240)

      // Preferencia según `direction`, con volteo si no cabe en el viewport.
      let left = direction === "right" ? rect.right + gap : rect.left - width - gap
      if (direction === "right" && left + width > window.innerWidth - 8) {
        left = rect.left - width - gap
      } else if (direction === "left" && left < 8) {
        left = rect.right + gap
      }
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8))

      // Alinea con la parte superior del campo, sin salirse por abajo.
      let top = rect.top
      if (top + LIST_MAX_HEIGHT > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - 8 - LIST_MAX_HEIGHT)
      }

      setCoords({ left, top, width })
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open, horizontal, direction])

  const openList = () => {
    if (disabled) return
    // Prefija con el texto actual (no vacío) para que se vea como texto real,
    // editable, en lugar de aparecer atenuado como placeholder.
    setQuery(currentLabel)
    setOpen(true)
    onOpen?.()
    // Selecciona todo para poder reemplazarlo escribiendo o editarlo rápido.
    if (currentLabel) requestAnimationFrame(() => inputRef.current?.select())
  }

  const pick = (opt: Option) => {
    onChange(opt.value)
    setQuery("")
    setOpen(false)
  }

  const baseField =
    "flex items-center rounded-lg border border-gray-200 dark:border-slate-600 " +
    "bg-white dark:bg-slate-700 focus-within:ring-2 focus-within:ring-sky-400 transition-colors " +
    (disabled ? "opacity-60 cursor-not-allowed" : "")

  const listClass =
    "max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-600 " +
    "bg-white dark:bg-slate-800 shadow-lg py-1"

  // Rotación del chevron al abrir (parte de ChevronDown = ∨, apuntando abajo).
  // Cerrado siempre apunta hacia abajo; al abrir gira hacia la dirección en que
  // se despliega la lista.
  const arrowRotation: Record<typeof direction, string> = {
    down: "rotate-0",
    up: "rotate-180",
    left: "rotate-90",
    right: "-rotate-90",
  }

  // Texto libre: se ofrece "usar «texto»" cuando lo escrito no coincide
  // exactamente con ninguna opción existente.
  const trimmedQuery = query.trim()
  const showCreate =
    creatable && trimmedQuery !== "" &&
    !options.some(o => norm(o.label) === norm(trimmedQuery))

  const createItem = showCreate ? (
    <li key="__create__">
      <button
        type="button"
        onClick={() => pick({ value: trimmedQuery, label: trimmedQuery })}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-sky-700 dark:text-sky-300
                   hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
      >
        <Plus className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          {createLabel ? createLabel(trimmedQuery) : <>Usar «{trimmedQuery}»</>}
        </span>
      </button>
    </li>
  ) : null

  // Contenido de la lista, compartido entre el modo absoluto y el portal lateral.
  const listItems = loading ? (
    <li className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">Cargando…</li>
  ) : filtered.length === 0 && !showCreate ? (
    <li className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">{emptyText}</li>
  ) : (
    <>
      {filtered.map(opt => {
        const active = opt.value === value
        return (
          <li key={opt.value}>
            <button
              type="button"
              onClick={() => pick(opt)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors
                ${active
                  ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-medium"
                  : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
            >
              <Check className={`w-3.5 h-3.5 shrink-0 ${active ? "opacity-100 text-sky-500" : "opacity-0"}`} />
              <span className="truncate">{opt.label}</span>
              {opt.badge && (
                <span className="ml-auto shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  {opt.badge}
                </span>
              )}
            </button>
          </li>
        )
      })}
      {createItem}
    </>
  )

  // Encabezado opcional fijo (sticky) + opciones. Se comparte entre ambos modos.
  const listContent = (
    <>
      {listHeader && (
        <li className="sticky top-0 z-10 border-b border-gray-100 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800">
          {listHeader}
        </li>
      )}
      {listItems}
    </>
  )

  return (
    <div ref={rootRef} className="relative">
      <div className={baseField}>
        {/* Lado izquierdo: escribir para buscar */}
        <input
          ref={inputRef}
          type="text"
          name={name}
          disabled={disabled}
          autoComplete="off"
          value={open ? query : currentLabel}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={openList}
          onBlur={e => {
            // Con texto libre habilitado, al salir del campo se confirma lo
            // escrito para no perderlo si el usuario no eligió una opción ni
            // presionó Enter. Si el foco pasa a la lista (elegir/crear), se deja
            // que ese clic maneje el valor.
            if (!creatable) return
            const next = e.relatedTarget as Node | null
            if (next && (rootRef.current?.contains(next) || listRef.current?.contains(next))) return
            const q = query.trim()
            if (!q || norm(q) === norm(currentLabel)) return
            const exact = options.find(o => norm(o.label) === norm(q))
            onChange(exact ? exact.value : q)
          }}
          onKeyDown={e => {
            if (e.key === "Escape") { setOpen(false); setQuery(""); inputRef.current?.blur() }
            if (e.key === "Enter") {
              e.preventDefault()
              const q = query.trim()
              const exact = q ? options.find(o => norm(o.label) === norm(q)) : undefined
              if (exact) {
                // Coincidencia exacta con una opción del catálogo.
                onChange(exact.value); setOpen(false)
              } else if (creatable && q !== "") {
                // Texto libre: se conserva tal cual lo escribió el usuario.
                onChange(q); setOpen(false)
              } else if (open && filtered.length > 0) {
                // Sin texto libre: se toma la primera coincidencia.
                onChange(filtered[0].value); setOpen(false)
              } else {
                return
              }
              // Deja el texto confirmado seleccionado dentro del input para
              // poder modificarlo rápidamente.
              requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select() })
            }
          }}
          className="flex-1 min-w-0 h-9 px-3 bg-transparent text-sm text-gray-900 dark:text-slate-100
                     placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none"
        />
        {/* Lado derecho: clic para desplegar */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => (open ? (setOpen(false), setQuery("")) : (openList(), inputRef.current?.focus()))}
          className="shrink-0 h-9 px-2 flex items-center text-gray-400 hover:text-sky-500 transition-colors"
          title="Desplegar"
          tabIndex={-1}
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? arrowRotation[direction] : "rotate-0"}`} />
        </button>
      </div>

      {/* Lista hacia arriba/abajo: posicionada dentro del propio componente. */}
      {open && !horizontal && (
        <ul
          ref={listRef}
          className={`absolute z-50 w-full ${listClass} ${direction === "up" ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          {listContent}
        </ul>
      )}

      {/* Lista hacia los lados: en un portal con posición fija para no quedar
          recortada por contenedores con overflow (p. ej. la ventana emergente). */}
      {open && horizontal && coords && typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            style={{ position: "fixed", left: coords.left, top: coords.top, width: coords.width, zIndex: 9999 }}
            className={listClass}
          >
            {listContent}
          </ul>,
          document.body,
        )}
    </div>
  )
}
