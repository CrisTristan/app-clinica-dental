"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { ChevronDown, Check } from "lucide-react"

export type Option = { value: string; label: string }

// Normaliza para comparar sin acentos ni mayúsculas (útil para "México", etc.).
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

// Select con búsqueda: se escribe a la izquierda para filtrar y se hace clic
// en la flecha de la derecha para desplegar. Reutilizable con cualquier lista
// de opciones { value, label }.
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "— Seleccionar —",
  disabled = false,
  emptyText = "Sin coincidencias",
  name,
  direction = "down",
}: {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  emptyText?: string
  name?: string
  direction?: "up" | "down"
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = useMemo(() => {
    const q = norm(query.trim())
    if (!q) return options
    return options.filter(o => norm(o.label).includes(q))
  }, [options, query])

  // Cerrar al hacer clic fuera del componente.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const openList = () => {
    if (disabled) return
    setQuery("")
    setOpen(true)
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
          value={open ? query : (selected?.label ?? "")}
          placeholder={open && selected ? selected.label : placeholder}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={openList}
          onKeyDown={e => {
            if (e.key === "Escape") { setOpen(false); setQuery(""); inputRef.current?.blur() }
            if (e.key === "Enter" && open && filtered.length > 0) { e.preventDefault(); pick(filtered[0]) }
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
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Lista de coincidencias */}
      {open && (
        <ul className={`absolute z-50 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-600
                       bg-white dark:bg-slate-800 shadow-lg py-1
                       ${direction === "up" ? "bottom-full mb-1" : "top-full mt-1"}`}>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">{emptyText}</li>
          ) : (
            filtered.map(opt => {
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
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
